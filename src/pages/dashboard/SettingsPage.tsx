import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  Calendar,
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  CheckCircle,
  ClipboardList,
  Loader2,
  Save,
  RefreshCw,
  Lock,
  Bell,
} from 'lucide-react';

type DashboardRole = 'client' | 'technician' | 'admin' | 'support';

type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type SettingsPageProps = {
  dashboardRole?: DashboardRole;
};

const clientNavItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

const technicianNavItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
  { label: 'Settings', href: '/dashboard/technician/settings', icon: Settings },
];

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const getNavItems = (role: DashboardRole) => {
  if (role === 'technician') return technicianNavItems;
  if (role === 'admin' || role === 'support') return adminNavItems;
  return clientNavItems;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function SettingsPage({ dashboardRole }: SettingsPageProps) {
  const { user, profile, role, refreshProfile } = useAuth();
  const effectiveRole = (dashboardRole || role || 'client') as DashboardRole;
  const navItems = useMemo(() => getNavItems(effectiveRole), [effectiveRole]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lagos');
  const [preferredServiceTypes, setPreferredServiceTypes] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobUpdatesNotifications, setJobUpdatesNotifications] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [platformFee, setPlatformFee] = useState('10');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const defaults = {
      fullName: profile?.full_name || '',
      email: user?.email || profile?.email || '',
      phone: profile?.phone || '',
      city: profile?.city || 'Lagos',
    };

    setFullName(defaults.fullName);
    setEmail(defaults.email);
    setPhone(defaults.phone);
    setCity(defaults.city);

    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const notificationsKey = `dia_settings_${user.id}_notifications`;
      const notificationsRaw = localStorage.getItem(notificationsKey);
      if (notificationsRaw) {
        const parsed = JSON.parse(notificationsRaw) as {
          emailNotifications?: boolean;
          jobUpdatesNotifications?: boolean;
        };
        setEmailNotifications(parsed.emailNotifications ?? true);
        setJobUpdatesNotifications(parsed.jobUpdatesNotifications ?? true);
      }

      const preferencesKey = `dia_settings_${user.id}_preferences`;
      const preferencesRaw = localStorage.getItem(preferencesKey);
      if (preferencesRaw) {
        const parsed = JSON.parse(preferencesRaw) as {
          preferredServiceTypes?: string;
          defaultCity?: string;
        };
        setPreferredServiceTypes(parsed.preferredServiceTypes || '');
        if (parsed.defaultCity) setCity(parsed.defaultCity);
      }

      const adminSettingsRaw = localStorage.getItem('dia_admin_settings');
      if (adminSettingsRaw) {
        const parsed = JSON.parse(adminSettingsRaw) as {
          platformFee?: string;
          categories?: ServiceCategory[];
        };
        if (parsed.platformFee) setPlatformFee(parsed.platformFee);
        if (Array.isArray(parsed.categories)) setServiceCategories(parsed.categories);
      }
    } catch (error) {
      console.error('APP ERROR:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, profile?.full_name, profile?.email, profile?.phone, profile?.city]);

  useEffect(() => {
    const loadServiceCategories = async () => {
      if (effectiveRole !== 'admin' && effectiveRole !== 'support') return;

      try {
        ensureSupabaseConfigured();
        const { data, error } = await supabase
          .from('services')
          .select('id, name, slug, is_active')
          .order('name', { ascending: true });

        if (error) throw error;

        if (Array.isArray(data) && data.length > 0) {
          const categories = (data as ServiceCategory[]).map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            is_active: item.is_active,
          }));
          setServiceCategories(categories);
        }
      } catch (error) {
        console.error('APP ERROR:', error);
      }
    };

    void loadServiceCategories();
  }, [effectiveRole]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const saveProfileSettings = async () => {
    if (!user) {
      setError('No active user session found.');
      return;
    }

    setIsSavingProfile(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
        })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      if (email.trim() && email.trim() !== user.email) {
        const { error: emailUpdateError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailUpdateError) throw emailUpdateError;
      }

      const preferencesKey = `dia_settings_${user.id}_preferences`;
      localStorage.setItem(
        preferencesKey,
        JSON.stringify({
          defaultCity: city.trim() || 'Lagos',
          preferredServiceTypes: preferredServiceTypes.trim(),
        })
      );

      await refreshProfile();
      setSuccess('Profile settings saved successfully.');
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveNotificationSettings = () => {
    if (!user) {
      setError('No active user session found.');
      return;
    }

    try {
      const notificationsKey = `dia_settings_${user.id}_notifications`;
      localStorage.setItem(
        notificationsKey,
        JSON.stringify({
          emailNotifications,
          jobUpdatesNotifications,
        })
      );
      setSuccess('Notification settings saved successfully.');
    } catch (error) {
      console.error('APP ERROR:', error);
      setError('Failed to save notification settings');
    }
  };

  const updatePassword = async () => {
    if (!user) {
      setError('No active user session found.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);

    setIsUploadingAvatar(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/*',
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = publicData.publicUrl;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      setSuccess('Profile picture updated successfully.');
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setAvatarPreview('');
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    const slug = slugify(name);
    if (!slug) return;

    const exists = serviceCategories.some((item) => item.slug === slug);
    if (exists) {
      setError('Category already exists.');
      return;
    }

    setServiceCategories((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, name, slug, is_active: true },
    ]);
    setNewCategoryName('');
  };

  const toggleCategory = (categoryId: string) => {
    setServiceCategories((prev) =>
      prev.map((item) =>
        item.id === categoryId
          ? { ...item, is_active: !item.is_active }
          : item
      )
    );
  };

  const saveAdminSettings = () => {
    try {
      localStorage.setItem(
        'dia_admin_settings',
        JSON.stringify({
          platformFee,
          categories: serviceCategories,
        })
      );
      setSuccess('Admin settings saved locally.');
    } catch (error) {
      console.error('APP ERROR:', error);
      setError('Failed to save admin settings');
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole={effectiveRole === 'support' ? 'admin' : effectiveRole}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-400">Manage account, preferences, notifications, and security.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-[#00C853]/10 border-[#00C853]/40">
            <AlertDescription className="text-[#00C853]">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={avatarPreview || profile?.avatar_url || '/default-avatar.svg'}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover border border-gray-700 bg-[#111]"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="settings-avatar" className="text-gray-300">Profile Picture</Label>
                <input
                  id="settings-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar || !user}
                  className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-[#00C853] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#00C853]/90 disabled:opacity-60"
                />
                {isUploadingAvatar && (
                  <p className="text-sm text-gray-400 inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Phone</Label>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Default City</Label>
                <Input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={saveProfileSettings}
              disabled={isSavingProfile || isLoading}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white inline-flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#111] p-4">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-xs text-gray-400">Receive account and booking emails.</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#111] p-4">
              <div>
                <p className="text-white font-medium">Job Updates</p>
                <p className="text-xs text-gray-400">Get notified when booking status changes.</p>
              </div>
              <Switch checked={jobUpdatesNotifications} onCheckedChange={setJobUpdatesNotifications} />
            </div>

            <Button type="button" onClick={saveNotificationSettings} className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white inline-flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={updatePassword}
              disabled={isUpdatingPassword}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-gray-300">Preferred Service Types (comma-separated)</Label>
              <Input
                value={preferredServiceTypes}
                onChange={(event) => setPreferredServiceTypes(event.target.value)}
                placeholder="e.g. Plumbing, Electrical, Cleaning"
                className="bg-[#2a2a2a] border-gray-700 text-white"
              />
            </div>
            <p className="text-xs text-gray-500">Preference values are saved with your settings.</p>
          </CardContent>
        </Card>

        {(effectiveRole === 'admin' || effectiveRole === 'support') && (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Admin Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-300">Platform Fee (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={platformFee}
                  onChange={(event) => setPlatformFee(event.target.value)}
                  className="bg-[#2a2a2a] border-gray-700 text-white max-w-xs"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Service Categories Management</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Add category name"
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                  />
                  <Button type="button" onClick={addCategory} className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
                    Add Category
                  </Button>
                </div>

                {serviceCategories.length === 0 ? (
                  <p className="text-sm text-gray-400">No categories available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {serviceCategories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#111] p-3">
                        <div>
                          <p className="text-white text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-gray-500">/{category.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={category.is_active ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-gray-700 text-gray-300'}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch checked={category.is_active} onCheckedChange={() => toggleCategory(category.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="button" onClick={saveAdminSettings} className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
                Save Admin Settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
