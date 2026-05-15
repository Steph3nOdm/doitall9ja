import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  Settings,
  ClipboardList,
  Loader2,
  Star,
  RefreshCw,
} from 'lucide-react';

type TechnicianProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  is_available: boolean | null;
  rating: number | null;
  total_jobs: number | null;
  avatar_url: string | null;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const normalizeSkill = (value: string) => value.trim().toLowerCase();

export default function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTechnicians = async () => {
    setIsLoading(true);
    setError('');

    try {
      ensureSupabaseConfigured();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTechnicians((data as TechnicianProfile[]) || []);
    } catch (error) {
      console.error('APP ERROR:', error);
      setError(error instanceof Error ? error.message : 'Failed to load technicians');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTechnicians();
  }, []);

  const skillOptions = useMemo(() => {
    const allSkills = technicians.flatMap((tech) => tech.skills || []);
    const unique = Array.from(new Set(allSkills.map((skill) => skill.trim()).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [technicians]);

  const filteredTechnicians = useMemo(() => {
    if (selectedSkill === 'all') return technicians;
    const normalizedSelectedSkill = normalizeSkill(selectedSkill);

    return technicians.filter((tech) =>
      (tech.skills || []).some((skill) => normalizeSkill(skill).includes(normalizedSelectedSkill))
    );
  }, [selectedSkill, technicians]);

  const groupedBySkill = useMemo(() => {
    const groups = new Map<string, TechnicianProfile[]>();

    technicians.forEach((tech) => {
      const skills = (tech.skills || []).map((skill) => skill.trim()).filter(Boolean);
      if (skills.length === 0) {
        const fallbackKey = 'Uncategorized';
        const current = groups.get(fallbackKey) || [];
        groups.set(fallbackKey, [...current, tech]);
        return;
      }

      skills.forEach((skill) => {
        const current = groups.get(skill) || [];
        groups.set(skill, [...current, tech]);
      });
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [technicians]);

  return (
    <DashboardLayout navItems={navItems} userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Technicians</h1>
            <p className="text-gray-400">Monitor technicians and filter by skill category.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loadTechnicians}
            disabled={isLoading}
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

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Filter By Skill</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger className="w-full md:w-80 bg-[#2a2a2a] border-gray-700 text-white">
                <SelectValue placeholder="All skills" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-gray-700">
                <SelectItem value="all">All skills</SelectItem>
                {skillOptions.map((skill) => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">All Technicians ({filteredTechnicians.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <p className="text-gray-400">No technicians found for this skill filter.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTechnicians.map((tech) => (
                  <div key={tech.id} className="rounded-lg border border-gray-800 bg-[#111] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={tech.avatar_url || '/default-avatar.svg'}
                          alt={tech.full_name || 'Technician'}
                          className="h-12 w-12 rounded-full object-cover border border-gray-700"
                          onError={(event) => {
                            (event.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                          }}
                        />
                        <div>
                          <p className="text-white font-semibold">{tech.full_name || 'Unnamed Technician'}</p>
                          <p className="text-xs text-gray-400">{tech.email || 'No email available'}</p>
                          <p className="text-xs text-gray-500">{tech.phone || 'No phone available'}</p>
                        </div>
                      </div>
                      <Badge
                        className={
                          tech.is_available === false
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-[#00C853]/20 text-[#00C853] border-[#00C853]/30'
                        }
                      >
                        {tech.is_available === false ? 'Unavailable' : 'Available'}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {(tech.skills || []).length > 0 ? (
                          (tech.skills || []).map((skill) => (
                            <Badge key={`${tech.id}-${skill}`} className="bg-[#2a2a2a] text-gray-200 border-gray-700">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No skills listed</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <span className="text-gray-300 inline-flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        {typeof tech.rating === 'number' ? tech.rating.toFixed(1) : 'N/A'}
                      </span>
                      <span className="text-gray-400">Jobs completed: {tech.total_jobs || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">By Skill Category</CardTitle>
          </CardHeader>
          <CardContent>
            {groupedBySkill.length === 0 ? (
              <p className="text-gray-400">No skill data available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupedBySkill.map(([skill, group]) => (
                  <div key={skill} className="rounded-lg border border-gray-800 bg-[#111] p-4">
                    <p className="text-white font-semibold">{skill}</p>
                    <p className="text-sm text-gray-400 mt-1">{group.length} technician(s)</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
