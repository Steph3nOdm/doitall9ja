import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState<'client' | 'technician'>('client');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.phone.match(/^\+?[\d\s-]{10,}$/)) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: formData.phone,
        role: role,
      });
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError('Network error while connecting to auth service. Check Supabase URL/key environment variables and redeploy.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] px-4 py-12">
        <Card className="bg-[#1a1a1a] border-gray-800 max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-[#00C853]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-[#00C853]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-gray-400 mb-6">
              Please check your email to verify your account. Once verified, you can sign in to your dashboard.
            </p>
            <Button
              onClick={() => navigate('/auth/login')}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Create Account
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Join DIA as a client or technician
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={role} onValueChange={(v) => setRole(v as 'client' | 'technician')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a]">
                <TabsTrigger 
                  value="client" 
                  className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black"
                >
                  I Need a Service
                </TabsTrigger>
                <TabsTrigger 
                  value="technician"
                  className="data-[state=active]:bg-[#00C853] data-[state=active]:text-black"
                >
                  I'm a Technician
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="client" className="mt-4">
                <p className="text-sm text-gray-400 text-center">
                  Book trusted technicians for your home services
                </p>
              </TabsContent>
              <TabsContent value="technician" className="mt-4">
                <p className="text-sm text-gray-400 text-center">
                  Find jobs and grow your career with DIA
                </p>
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="pl-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00C853] focus:ring-[#00C853]/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00C853] focus:ring-[#00C853]/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+234 816 222 3364"
                    value={formData.phone}
                    onChange={handleChange}
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
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00C853] focus:ring-[#00C853]/20"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                    Creating account...
                  </>
                ) : (
                  `Sign Up as ${role === 'client' ? 'Client' : 'Technician'}`
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
              Already have an account?{' '}
              <Link 
                to="/auth/login" 
                className="text-[#00C853] hover:text-[#00C853]/80 font-medium transition-colors"
              >
                Sign in
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
