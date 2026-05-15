import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, ArrowLeft } from 'lucide-react';

type PublicTechnician = {
  id: string;
  full_name: string;
  phone: string | null;
  skills: string[] | null;
  avatar_url: string | null;
};

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<PublicTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
        console.log('Technicians:', data);
        setTechnicians((data as PublicTechnician[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load technicians');
        setTechnicians([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadTechnicians();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-gray-800 bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">DIA</span>
            <span className="text-sm text-gray-400">Do It All</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">All Technicians</h1>
          <p className="text-gray-400 mt-2">Browse available professionals and their skills.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00C853] mx-auto" />
          </div>
        ) : technicians.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-[#1a1a1a] p-8 text-center text-gray-400">
            No technicians available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {technicians.slice(0, 4).map((technician) => (
              <Card key={technician.id} className="bg-[#1a1a1a] border-gray-800">
                <div className="p-4 pb-0">
                  <img
                    src={technician.avatar_url || '/default-avatar.svg'}
                    alt={technician.full_name || 'Technician'}
                    className="h-40 w-full rounded-lg object-cover bg-[#111] border border-gray-800"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                    }}
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-white">{technician.full_name || 'Unnamed Technician'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Skills</p>
                    <p className="text-gray-300">
                      {technician.skills?.join(', ') || 'No skills listed'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#00C853]/20 text-[#00C853]">Technician</Badge>
                    {technician.phone ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                        <Phone className="h-4 w-4" />
                        {technician.phone}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Phone not available</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
