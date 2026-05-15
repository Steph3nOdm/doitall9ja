import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBookings } from '@/hooks/useBookings';
import { resolveBookingJobType, resolveInitialQuoteStatus } from '@/lib/bookingFlow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, Calendar, Phone, User, Mail, MapPin, DollarSign } from 'lucide-react';
import type { Service } from '@/types/database';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  services: Service[];
}

const urgencyLevels = [
  { id: 'low', name: 'Low', description: 'Within a week' },
  { id: 'medium', name: 'Medium', description: 'Within 2-3 days' },
  { id: 'high', name: 'High', description: 'Within 24 hours' },
  { id: 'emergency', name: 'Emergency', description: 'ASAP' },
];

const budgetTypes = [
  { id: 'fixed', name: 'Fixed Budget' },
  { id: 'hourly', name: 'Hourly Rate' },
  { id: 'negotiable', name: 'Negotiable' },
];

const timeSlots = [
  { id: 'morning', name: 'Morning (8AM - 12PM)' },
  { id: 'afternoon', name: 'Afternoon (12PM - 4PM)' },
  { id: 'evening', name: 'Evening (4PM - 8PM)' },
];

// Icon mapping for services
const iconMap: Record<string, string> = {
  'electrical': 'âš¡',
  'plumbing': 'ðŸ”§',
  'carpentry': 'ðŸªš',
  'painting': 'ðŸŽ¨',
  'ac': 'â„ï¸',
  'appliance': 'ðŸ”Œ',
};

export function BookingModal({ isOpen, onClose, service, services }: BookingModalProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { submitBooking, isSubmitting, error, lastBooking, clearLastBooking } = useBookings();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_id: service?.id || '',
    address: '',
    city: 'Lagos',
    description: '',
    preferred_date: '',
    preferred_time: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    budget_type: 'negotiable' as 'fixed' | 'hourly' | 'negotiable',
    budget_amount: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedService = useMemo(
    () => services.find((svc) => svc.id === formData.service_id) || service || null,
    [formData.service_id, services, service]
  );

  const selectedJobType = useMemo(
    () => resolveBookingJobType(selectedService),
    [selectedService]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await submitBooking({
      ...formData,
      budget_amount: formData.budget_amount ? parseInt(formData.budget_amount) : undefined,
      job_type: selectedJobType,
      quote_status: resolveInitialQuoteStatus(selectedJobType),
      payment_status: 'pending',
    });

    if (success) {
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          service_id: '',
          address: '',
          city: 'Lagos',
          description: '',
          preferred_date: '',
          preferred_time: '',
          urgency: 'medium',
          budget_type: 'negotiable',
          budget_amount: '',
        });
        clearLastBooking();
        onClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      clearLastBooking();
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      onClose();
      navigate('/login', {
        replace: true,
        state: {
          from: { pathname: location.pathname },
          intendedAction: 'booking',
        },
      });
    }
  }, [isOpen, isAuthenticated, navigate, location.pathname, onClose]);

  // Get service icon
  const getServiceIcon = (svc: Service) => {
    return iconMap[svc.slug] || 'ðŸ”§';
  };

  if (lastBooking) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-gray-800 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Booking Submitted</DialogTitle>
            <DialogDescription>Your booking has been submitted successfully.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-[#00C853]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-[#00C853]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Booking Submitted!</h3>
            <p className="text-gray-400 text-sm">
              Thank you for your booking request. We'll contact you shortly to confirm your appointment.
            </p>
            <p className="text-[#00C853] text-sm mt-2">
              Booking Reference: #{lastBooking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[#1a1a1a] border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Book a Service</DialogTitle>
          <DialogDescription className="text-gray-400">
            Fill in the details below and we'll get back to you shortly.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service" className="text-gray-300">Select Service</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => handleChange('service_id', value)}
              required
            >
              <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-gray-700">
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id} className="text-white">
                    <span className="flex items-center gap-2">
                      <span>{getServiceIcon(svc)}</span>
                      <span>{svc.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Flow: {selectedJobType === 'inspection' ? 'Inspection required before final pricing' : 'Fixed pricing'}
            </p>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                placeholder="John Doe"
                className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => handleChange('customer_phone', e.target.value)}
                placeholder="+234 816 222 3364"
                className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleChange('customer_email', e.target.value)}
              placeholder="you@example.com"
              className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Service Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter your full address..."
              className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Job Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what you need help with..."
              className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
              required
            />
          </div>

          {/* Preferred Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Preferred Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.preferred_date}
                onChange={(e) => handleChange('preferred_date', e.target.value)}
                className="bg-[#2a2a2a] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-gray-300">
                Preferred Time
              </Label>
              <Select
                value={formData.preferred_time}
                onValueChange={(value) => handleChange('preferred_time', value)}
              >
                <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-700">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id} className="text-white">
                      {slot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label className="text-gray-300">Urgency Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {urgencyLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleChange('urgency', level.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.urgency === level.id
                      ? 'border-[#00C853] bg-[#00C853]/10'
                      : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
                  }`}
                >
                  <p className="font-medium text-white text-sm">{level.name}</p>
                  <p className="text-xs text-gray-400">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget
            </Label>
            <Select
              value={formData.budget_type}
              onValueChange={(value: 'fixed' | 'hourly' | 'negotiable') => handleChange('budget_type', value)}
            >
              <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-gray-700">
                {budgetTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="text-white">
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {formData.budget_type !== 'negotiable' && (
              <Input
                type="number"
                value={formData.budget_amount}
                onChange={(e) => handleChange('budget_amount', e.target.value)}
                placeholder={`Amount in â‚¦ (${formData.budget_type === 'hourly' ? 'per hour' : 'total'})`}
                className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500 mt-2"
              />
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold h-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Booking Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

