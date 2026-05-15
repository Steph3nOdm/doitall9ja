import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientJobs } from '@/hooks/useJobs';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: Calendar },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

const serviceCategories = [
  { id: 'electrical', name: 'Electrical Repairs', icon: '⚡' },
  { id: 'plumbing', name: 'Plumbing', icon: '🔧' },
  { id: 'carpentry', name: 'Carpentry', icon: '🪚' },
  { id: 'painting', name: 'Painting', icon: '🎨' },
  { id: 'ac', name: 'AC Installation & Repair', icon: '❄️' },
  { id: 'appliance', name: 'Appliance Repair', icon: '🔌' },
];

const urgencyLevels = [
  { id: 'low', name: 'Low', description: 'Within a week', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'medium', name: 'Medium', description: 'Within 2-3 days', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'high', name: 'High', description: 'Within 24 hours', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'emergency', name: 'Emergency', description: 'ASAP', color: 'bg-red-500/20 text-red-400' },
];

const budgetTypes = [
  { id: 'fixed', name: 'Fixed Budget' },
  { id: 'hourly', name: 'Hourly Rate' },
  { id: 'negotiable', name: 'Negotiable' },
];

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
};

export default function ClientRequestService() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { createJob } = useClientJobs();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    location: '',
    address: '',
    budget: '',
    budget_type: 'negotiable',
    urgency: 'medium',
    preferred_date: '',
    preferred_time: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', {
        replace: true,
        state: {
          from: { pathname: location.pathname },
          intendedAction: 'request_service',
        },
      });
    }
  }, [isAuthenticated, navigate, location.pathname]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.category) {
          setError('Please select a service category');
          return false;
        }
        return true;
      case 2:
        if (!formData.title.trim()) {
          setError('Please provide a title for your request');
          return false;
        }
        if (!formData.description.trim() || formData.description.length < 20) {
          setError('Please provide a detailed description (at least 20 characters)');
          return false;
        }
        return true;
      case 3:
        if (!formData.address.trim()) {
          setError('Please provide your address');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await createJob({
        title: formData.title,
        description: formData.description,
        category: serviceCategories.find(c => c.id === formData.category)?.name || formData.category,
        location: formData.location || 'Lagos',
        address: formData.address,
        budget: formData.budget ? parseInt(formData.budget) : undefined,
        budget_type: formData.budget_type as 'fixed' | 'hourly' | 'negotiable',
        urgency: formData.urgency as 'low' | 'medium' | 'high' | 'emergency',
        preferred_date: formData.preferred_date || undefined,
        preferred_time: formData.preferred_time || undefined,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <DashboardLayout navItems={navItems} userRole="client">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-[#00C853]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-[#00C853]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
              <p className="text-gray-400 mb-6">
                Your service request has been submitted successfully. We'll review it and assign a technician soon.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/dashboard/client/jobs')}
                  className="bg-[#00C853] hover:bg-[#00C853]/90 text-black"
                >
                  View My Jobs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/client')}
                  className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userRole="client">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step === 1 ? navigate('/dashboard/client') : handleBack()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Request a Service</h1>
            <p className="text-gray-400 text-sm">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-[#00C853]' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <Alert className="mb-6 bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && 'Select Service Category'}
              {step === 2 && 'Describe Your Request'}
              {step === 3 && 'Location & Schedule'}
              {step === 4 && 'Budget & Review'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {step === 1 && 'What type of service do you need?'}
              {step === 2 && 'Provide details about the work required'}
              {step === 3 && 'Where and when do you need the service?'}
              {step === 4 && 'Set your budget and urgency level'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Category Selection */}
            {step === 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {serviceCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleChange('category', category.id)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      formData.category === category.id
                        ? 'border-[#00C853] bg-[#00C853]/10'
                        : 'border-gray-800 bg-[#2a2a2a] hover:border-gray-700'
                    }`}
                  >
                    <span className="text-3xl mb-3 block">{category.icon}</span>
                    <span className="font-medium text-white text-sm">{category.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Description */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-300">Job Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Fix leaking kitchen sink"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue in detail..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 min-h-[150px]"
                  />
                  <p className="text-xs text-gray-500">
                    Minimum 20 characters. Include details like the problem, any error messages, and what you've tried.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Location & Schedule */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Full Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your complete address..."
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_date" className="text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Preferred Date (Optional)
                    </Label>
                    <Input
                      id="preferred_date"
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => handleChange('preferred_date', e.target.value)}
                      className="bg-[#2a2a2a] border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_time" className="text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Preferred Time (Optional)
                    </Label>
                    <Select
                      value={formData.preferred_time}
                      onValueChange={(value) => handleChange('preferred_time', value)}
                    >
                      <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-700">
                        <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                        <SelectItem value="evening">Evening (4PM - 8PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Budget & Urgency */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-gray-300">Urgency Level</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {urgencyLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => handleChange('urgency', level.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.urgency === level.id
                            ? 'border-[#00C853] bg-[#00C853]/10'
                            : 'border-gray-800 bg-[#2a2a2a] hover:border-gray-700'
                        }`}
                      >
                        <Badge className={`${level.color} mb-2`}>
                          {level.name}
                        </Badge>
                        <p className="text-xs text-gray-400">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-gray-800" />

                <div className="space-y-4">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Budget
                  </Label>
                  
                  <Select
                    value={formData.budget_type}
                    onValueChange={(value) => handleChange('budget_type', value)}
                  >
                    <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-700">
                      {budgetTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.budget_type !== 'negotiable' && (
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-gray-300">
                        Amount (₦)
                      </Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="e.g., 5000"
                        value={formData.budget}
                        onChange={(e) => handleChange('budget', e.target.value)}
                        className="bg-[#2a2a2a] border-gray-700 text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-[#2a2a2a] rounded-lg space-y-2">
                  <h4 className="font-medium text-white">Request Summary</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p><span className="text-gray-500">Service:</span> {serviceCategories.find(c => c.id === formData.category)?.name}</p>
                    <p><span className="text-gray-500">Title:</span> {formData.title}</p>
                    <p><span className="text-gray-500">Urgency:</span> {urgencyLevels.find(u => u.id === formData.urgency)?.name}</p>
                    <p><span className="text-gray-500">Budget:</span> {formData.budget_type === 'negotiable' ? 'Negotiable' : `₦${formData.budget || '0'}`}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={step === 1 ? () => navigate('/dashboard/client') : handleBack}
                className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a]"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>

              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  className="bg-[#00C853] hover:bg-[#00C853]/90 text-black"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#00C853] hover:bg-[#00C853]/90 text-black"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
