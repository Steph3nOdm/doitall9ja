import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  PencilLine,
  Save,
  X,
} from 'lucide-react';
import type { ClientType, Profile, UserRole } from '@/types/database';

const CLIENT_TYPE_OPTIONS = [
  'Home Owner',
  'Tenant',
  'Landlord',
  'Property Manager',
  'Business Owner',
  'Contractor',
  'Other',
] as const;

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
];

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: Calendar },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const getNavItemsByRole = (role: UserRole | null) => {
  if (role === 'technician') return technicianNavItems;
  if (role === 'admin' || role === 'support') return adminNavItems;
  return clientNavItems;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
};

const isMissingColumnError = (err: unknown, column: string) => {
  if (!err || typeof err !== 'object') return false;
  const message = String((err as { message?: unknown }).message || '').toLowerCase();
  const details = String((err as { details?: unknown }).details || '').toLowerCase();
  const hint = String((err as { hint?: unknown }).hint || '').toLowerCase();
  const code = String((err as { code?: unknown }).code || '').toUpperCase();
  const needle = column.toLowerCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes(needle) ||
    details.includes(needle) ||
    hint.includes(needle)
  );
};

export default function ProfilePage() {
  const { user, profile: authProfile, role, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [clientType, setClientType] = useState<ClientType | ''>('');
  const [skillsInput, setSkillsInput] = useState('');
  const previewUrlRef = useRef<string | null>(null);

  const effectiveRole = (profile?.role || role || 'client') as UserRole;
  const navItems = useMemo(() => getNavItemsByRole(effectiveRole), [effectiveRole]);

  const hydrateEditFields = (data: Profile | null) => {
    setFullName(data?.full_name || '');
    setPhone(data?.phone || '');
    setClientType(data?.client_type || '');
    setSkillsInput((data?.skills || []).join(', '));
  };

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      const resolvedProfile = (data as Profile) || authProfile || null;
      setProfile(resolvedProfile);
      hydrateEditFields(resolvedProfile);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load profile'));
      const fallbackProfile = authProfile || null;
      setProfile(fallbackProfile);
      hydrateEditFields(fallbackProfile);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (authProfile && !isEditMode) {
      setProfile(authProfile);
      hydrateEditFields(authProfile);
    }
  }, [authProfile, isEditMode]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleCancelEdit = () => {
    hydrateEditFields(profile);
    setError('');
    setSuccess('');
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!user) {
      setError('No user session found');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      ensureSupabaseConfigured();

      const updates: Partial<Profile> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        client_type: clientType || null,
      };

      if (effectiveRole === 'technician') {
        updates.skills = skillsInput
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean);
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single();

      let updatedProfileData = data as Profile | null;
      let usedFallbackWithoutClientType = false;

      if (error) {
        if (!isMissingColumnError(error, 'client_type')) {
          throw error;
        }

        // Backward compatibility for environments where client_type migration is not applied yet.
        const { client_type: _ignoredClientType, ...updatesWithoutClientType } = updates;
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .update(updatesWithoutClientType)
          .eq('id', user.id)
          .select('*')
          .single();

        if (retryError) throw retryError;
        updatedProfileData = (retryData as Profile) || null;
        usedFallbackWithoutClientType = true;
      }

      const updatedProfile = updatedProfileData || null;
      setProfile(updatedProfile);
      hydrateEditFields(updatedProfile);
      setIsEditMode(false);
      void refreshProfile();
      setSuccess(
        usedFallbackWithoutClientType
          ? 'Profile updated. Run latest DB migration to enable Client Type storage.'
          : 'Profile updated successfully'
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = localPreviewUrl;
    setPreviewImage(localPreviewUrl);

    setUploading(true);
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

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      if (!publicUrl) {
        throw new Error('Failed to generate avatar URL');
      }

      const { data, error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select('*')
        .single();

      if (profileUpdateError) throw profileUpdateError;

      const updatedProfile = (data as Profile) || null;
      setProfile(updatedProfile);
      void refreshProfile();
      setSuccess('Profile image updated successfully');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload profile image'));
    } finally {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewImage('');
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole={effectiveRole}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-gray-400">Account and personal information.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadProfile}
            disabled={isLoading || isSaving}
            className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {!isEditMode ? (
            <Button
              type="button"
              onClick={() => {
                hydrateEditFields(profile);
                setError('');
                setSuccess('');
                setIsEditMode(true);
              }}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
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
            <CardTitle className="text-white">Profile Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={previewImage || profile?.avatar_url || '/default-avatar.svg'}
                alt="Profile avatar"
                className="h-24 w-24 rounded-full object-cover border border-gray-700 bg-[#111]"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="text-gray-300">
                  Upload new image
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={!user || uploading}
                  className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-[#00C853] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-[#00C853]/90 disabled:opacity-60"
                />
                {uploading && (
                  <p className="text-sm text-gray-400 inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">User Information</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : !user ? (
              <p className="text-gray-400">No user session found.</p>
            ) : isEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white"
                    placeholder="+234..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_type" className="text-gray-300">Client Type</Label>
                  <select
                    id="client_type"
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as ClientType | '')}
                    className="w-full h-10 rounded-md bg-[#2a2a2a] border border-gray-700 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C853]/30 focus:border-[#00C853]"
                  >
                    <option value="">Select client type</option>
                    {CLIENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {effectiveRole === 'technician' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="skills" className="text-gray-300">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      className="bg-[#2a2a2a] border-gray-700 text-white"
                      placeholder="Electrical, Plumbing, AC Repair"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-[#111] border border-gray-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  <p className="text-white inline-flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {profile?.full_name || 'Not set'}
                  </p>
                </div>

                <div className="rounded-lg bg-[#111] border border-gray-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-white inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {profile?.email || user.email || 'Not set'}
                  </p>
                </div>

                <div className="rounded-lg bg-[#111] border border-gray-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-white inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {profile?.phone || 'Not set'}
                  </p>
                </div>

                <div className="rounded-lg bg-[#111] border border-gray-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="text-white capitalize">{effectiveRole}</p>
                </div>

                <div className="rounded-lg bg-[#111] border border-gray-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Client Type</p>
                  <p className="text-white">{profile?.client_type || 'Not set'}</p>
                </div>

                {effectiveRole === 'technician' && (
                  <div className="rounded-lg bg-[#111] border border-gray-800 p-4 md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Skills</p>
                    <p className="text-white">
                      {(profile?.skills || []).length > 0 ? (profile?.skills || []).join(', ') : 'Not set'}
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-[#111] border border-gray-800 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="text-white inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {[profile?.address, profile?.city].filter(Boolean).join(', ') || 'Not set'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
