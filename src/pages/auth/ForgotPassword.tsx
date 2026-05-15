import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      ensureSupabaseConfigured();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-3xl font-bold text-white">DIA</span>
            <span className="text-sm text-gray-400">Do It All</span>
          </Link>
        </div>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Link 
                to="/auth/login" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Reset Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter your email and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#00C853]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-[#00C853]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                <p className="text-gray-400 text-sm mb-4">
                  We've sent a password reset link to <strong className="text-white">{email}</strong>
                </p>
                <p className="text-gray-500 text-xs">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="text-[#00C853] hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00C853] focus:ring-[#00C853]/20"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold h-11"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
