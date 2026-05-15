import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname;
      if (from && role) {
        navigate(from, { replace: true });
      } else {
        switch (role) {
          case 'client':
            navigate('/dashboard/client', { replace: true });
            break;
          case 'technician':
            navigate('/dashboard/technician', { replace: true });
            break;
          case 'admin':
          case 'support':
            navigate('/dashboard/admin', { replace: true });
            break;
          default:
            navigate('/', { replace: true });
        }
      }
    }
  }, [isAuthenticated, role, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      // Redirect will happen via useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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
            <CardTitle className="text-2xl font-bold text-white text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00C853] focus:ring-[#00C853]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-[#00C853] hover:text-[#00C853]/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold h-11"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1a1a] px-2 text-gray-500">Or</span>
              </div>
            </div>

            <p className="text-center text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link 
                to="/auth/signup" 
                className="text-[#00C853] hover:text-[#00C853]/80 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
