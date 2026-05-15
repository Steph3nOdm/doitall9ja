import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServices } from '@/hooks/useServices';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useReviews } from '@/hooks/useReviews';
import { BookingModal } from '@/components/booking/BookingModal';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Menu,
  Phone,
  CheckCircle,
  Star,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Users,
  Award,
  User,
  LogOut,
  LayoutDashboard,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Wind,
  Refrigerator,
} from 'lucide-react';
import type { Service } from '@/types/database';

// Icon component mapping
const iconComponents: Record<string, React.ElementType> = {
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  paintbrush: Paintbrush,
  wind: Wind,
  refrigerator: Refrigerator,
};

// Fallback icon emoji mapping
const iconEmojis: Record<string, string> = {
  electrical: '⚡',
  plumbing: '🔧',
  carpentry: '🪚',
  painting: '🎨',
  ac: '❄️',
  appliance: '🔌',
};

const howItWorks = [
  {
    step: '01',
    icon: Calendar,
    title: 'Book a service online',
    description: 'Tell us what you need through our simple booking form or give us a call.',
  },
  {
    step: '02',
    icon: User,
    title: 'DIA assigns a certified technician',
    description: 'We match you with the best available professional for your specific job.',
  },
  {
    step: '03',
    icon: CheckCircle,
    title: 'Technician arrives and completes the job',
    description: 'Your DIA professional arrives on time and gets the work done right.',
  },
  {
    step: '04',
    icon: Star,
    title: 'Customer confirms and reviews the service',
    description: 'Inspect the work, confirm completion, and share your feedback.',
  },
];

const standards = [
  {
    icon: Shield,
    title: 'Verified Technicians',
    description: 'Every DIA technician undergoes thorough background checks and skill verification.',
  },
  {
    icon: Users,
    title: 'Company-Managed Services',
    description: 'We employ and manage all technicians—no third-party contractors.',
  },
  {
    icon: CheckCircle,
    title: 'Job Completion Guarantee',
    description: 'We stay until the job is done right. Your satisfaction is our priority.',
  },
  {
    icon: Award,
    title: 'Customer Protection',
    description: 'Fully insured services with damage protection for your peace of mind.',
  },
];

export default function LandingPage() {
  const { isAuthenticated, role, signOut } = useAuth();
  const { services, isLoading: servicesLoading } = useServices();
  const { technicians, isLoading: techniciansLoading } = useTechnicians();
  const { reviews, isLoading: reviewsLoading } = useReviews();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardLink = () => {
    switch (role) {
      case 'client':
        return '/dashboard/client';
      case 'technician':
        return '/dashboard/technician';
      case 'admin':
      case 'support':
        return '/dashboard/admin';
      default:
        return '/';
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setBookingModalOpen(true);
  };

  const handleBookAnyService = () => {
    setSelectedService(null);
    setBookingModalOpen(true);
  };

  // Get service icon (component or emoji fallback)
  const getServiceIcon = (service: Service) => {
    const IconComponent = iconComponents[service.icon];
    if (IconComponent) {
      return <IconComponent className="h-7 w-7" />;
    }
    return <span className="text-2xl">{iconEmojis[service.slug] || '🔧'}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">DIA</span>
              <span className="text-sm text-gray-400 hidden sm:inline">Do It All</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('services')} className="text-gray-300 hover:text-white transition-colors">
                Services
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition-colors">
                How it Works
              </button>
              <button onClick={() => scrollToSection('technicians')} className="text-gray-300 hover:text-white transition-colors">
                Our Technicians
              </button>
              <button onClick={() => scrollToSection('standards')} className="text-gray-300 hover:text-white transition-colors">
                The DIA Standard
              </button>
              <button onClick={() => scrollToSection('join')} className="text-gray-300 hover:text-white transition-colors">
                Join DIA
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <a 
                href="tel:+2348162223364" 
                className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm">+234 816 222 3364</span>
              </a>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link to={getDashboardLink()}>
                    <Button 
                      variant="outline" 
                      className="hidden sm:flex border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={signOut}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/auth/login" className="hidden sm:block">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Button 
                    onClick={handleBookAnyService}
                    className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold"
                  >
                    Book Now
                  </Button>
                </div>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-gray-400">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-[#1a1a1a] border-gray-800">
                  <div className="flex flex-col gap-6 mt-8">
                    <button 
                      onClick={() => scrollToSection('services')} 
                      className="text-left text-gray-300 hover:text-white py-2"
                    >
                      Services
                    </button>
                    <button 
                      onClick={() => scrollToSection('how-it-works')} 
                      className="text-left text-gray-300 hover:text-white py-2"
                    >
                      How it Works
                    </button>
                    <button 
                      onClick={() => scrollToSection('technicians')} 
                      className="text-left text-gray-300 hover:text-white py-2"
                    >
                      Our Technicians
                    </button>
                    <button 
                      onClick={() => scrollToSection('standards')} 
                      className="text-left text-gray-300 hover:text-white py-2"
                    >
                      The DIA Standard
                    </button>
                    <button 
                      onClick={() => scrollToSection('join')} 
                      className="text-left text-gray-300 hover:text-white py-2"
                    >
                      Join DIA
                    </button>
                    
                    {!isAuthenticated && (
                      <div className="flex flex-col gap-3 pt-4 border-t border-gray-800">
                        <Link to="/auth/login">
                          <Button 
                            variant="outline" 
                            className="w-full border-gray-700 text-gray-300"
                          >
                            Sign In
                          </Button>
                        </Link>
                        <Button 
                          onClick={handleBookAnyService}
                          className="w-full bg-[#00C853] hover:bg-[#00C853]/90 text-black"
                        >
                          Book Now
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C853]/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse" />
              <span className="text-[#00C853] text-sm font-medium">Professional Home Services in Lagos</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Trusted Professionals for Every Home Service
            </h1>
            
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Book verified technicians for electrical, plumbing, carpentry, AC repair, painting, and home maintenance. DIA employs and manages all our professionals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button 
                onClick={handleBookAnyService}
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold text-lg px-8 py-6"
              >
                Book a Service
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <button onClick={() => scrollToSection('services')}>
                <Button 
                  variant="outline" 
                  className="border-gray-600 text-white hover:bg-white/10 text-lg px-8 py-6"
                >
                  Explore Services
                </Button>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#00C853]" />
                <span className="text-gray-300">Verified Technicians</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#00C853]" />
                <span className="text-gray-300">Same-Day Service</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#00C853]" />
                <span className="text-gray-300">Satisfaction Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#00C853] text-sm font-medium uppercase tracking-wider">Our Services</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
              Professional Home Services
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From quick fixes to major repairs, our skilled technicians handle it all with professionalism and care.
            </p>
          </div>

          {/* Services Grid */}
          {servicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl">
                  <Skeleton className="h-14 w-14 rounded-xl mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div 
                  key={service.id}
                  className="group p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl hover:border-[#00C853]/50 transition-all duration-300"
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: service.color + '20', color: service.color }}
                  >
                    {getServiceIcon(service)}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{service.name}</h3>
                  <p className="text-gray-400 mb-4">{service.description}</p>
                  <button
                    onClick={() => handleBookService(service)}
                    className="inline-flex items-center text-[#00C853] hover:text-[#00C853]/80 font-medium"
                  >
                    Book Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button 
              onClick={handleBookAnyService}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold px-8"
            >
              Book Any Service
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#00C853] text-sm font-medium uppercase tracking-wider">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
              Book a Service in Minutes
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Getting professional home help has never been easier. Four simple steps to get the job done.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-gray-800 absolute -top-4 left-0">
                  {step.step}
                </div>
                <div className="relative pt-8">
                  <div className="w-16 h-16 bg-[#00C853]/20 rounded-xl flex items-center justify-center mb-4">
                    <step.icon className="h-8 w-8 text-[#00C853]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-gray-700" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={handleBookAnyService}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold px-8"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* DIA Standard Section */}
      <section id="standards" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#00C853] text-sm font-medium uppercase tracking-wider">The DIA Standard</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-6">
                Every job is backed by our professional standards
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                We don't just promise quality—we deliver it. Our commitment to excellence sets us apart.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {standards.map((standard, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-[#00C853]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <standard.icon className="h-6 w-6 text-[#00C853]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{standard.title}</h3>
                      <p className="text-gray-400 text-sm">{standard.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl text-center">
                <p className="text-4xl font-bold text-[#00C853] mb-2">500+</p>
                <p className="text-gray-400">Jobs Completed</p>
              </div>
              <div className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl text-center">
                <p className="text-4xl font-bold text-[#00C853] mb-2">50+</p>
                <p className="text-gray-400">Verified Technicians</p>
              </div>
              <div className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl text-center">
                <p className="text-4xl font-bold text-[#00C853] mb-2">4.9</p>
                <p className="text-gray-400">Average Rating</p>
              </div>
              <div className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl text-center">
                <p className="text-4xl font-bold text-[#00C853] mb-2">100%</p>
                <p className="text-gray-400">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technicians Section */}
      <section id="technicians" className="py-20 lg:py-32 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="text-[#00C853] text-sm font-medium uppercase tracking-wider">Our Team</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                Meet Your DIA Professionals
              </h2>
              <p className="text-gray-400 mt-2">
                Skilled, verified, and dedicated to delivering quality service every time.
              </p>
            </div>
            <Link to="/technicians" className="mt-4 md:mt-0">
              <span className="text-[#00C853] hover:text-[#00C853]/80 font-medium flex items-center gap-2">
                View All Technicians
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {/* Technicians Grid */}
          {techniciansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
                  <Skeleton className="h-64 w-full" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : technicians.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No technicians available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {technicians.map((tech) => (
                <div 
                  key={tech.id}
                  className="group bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden hover:border-[#00C853]/50 transition-all duration-300"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={tech.image_url} 
                      alt={tech.full_name || 'Unknown'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';
                      }}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-sm font-medium">{tech.rating}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{tech.full_name || 'Unknown'}</h3>
                    <p className="text-[#00C853] text-sm">{tech.role}</p>
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tech.experience}
                      </span>
                      <span className="text-[#00C853]">{tech.jobs_completed} jobs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#00C853] text-sm font-medium uppercase tracking-wider">Customer Reviews</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Don't just take our word for it. Here's what homeowners across Lagos have to say about DIA.
            </p>
          </div>

          {/* Reviews Grid */}
          {reviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <Skeleton className="h-20 w-full mb-6" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No reviews available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div 
                  key={review.id}
                  className="p-6 bg-[#1a1a1a] border border-gray-800 rounded-xl"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{review.text}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{review.customer_name}</p>
                      <p className="text-sm text-gray-400">{review.location}</p>
                    </div>
                    <Badge className="bg-[#00C853]/20 text-[#00C853]">
                      {review.service}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-[#00C853] fill-[#00C853]" />
              ))}
            </div>
            <span className="text-gray-400">Rated 4.9/5 by 500+ customers</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-[#0a0a0a]/80" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Book a Trusted Technician Today
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust DIA for their home services. Professional technicians, transparent pricing, guaranteed satisfaction.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              onClick={handleBookAnyService}
              className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold text-lg px-8 py-6"
            >
              Request a Service
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <a href="tel:+2348162223364">
              <Button 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-white/10 text-lg px-8 py-6"
              >
                <Phone className="mr-2 h-5 w-5" />
                +234 816 222 3364
              </Button>
            </a>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#00C853]" />
              <span className="text-gray-300">Same-Day Service</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#00C853]" />
              <span className="text-gray-300">No Hidden Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#00C853]" />
              <span className="text-gray-300">Satisfaction Guaranteed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Get Started */}
      <section id="join" className="py-20 lg:py-32 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#00C853]/20 to-[#00C853]/5 border border-[#00C853]/30 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Ready to get started?
                </h2>
                <p className="text-gray-400">
                  Book a trusted technician today and experience the DIA difference.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleBookAnyService}
                  className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold px-6"
                >
                  Book a Service
                </Button>
                <a href="tel:+2348162223364">
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-white hover:bg-white/10"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call Us
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-white">DIA</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Do It All — Professional home services you can trust. Verified technicians, company-managed quality.
              </p>
              <div className="space-y-2 text-sm">
                <a href="mailto:hello@diaconcierge.com" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  <span>hello@diaconcierge.com</span>
                </a>
                <a href="tel:+2348162223364" className="flex items-center gap-2 text-gray-400 hover:text-white">
                  <span>+234 816 222 3364</span>
                </a>
                <p className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  Lagos, Nigeria
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => scrollToSection('services')} className="text-gray-400 hover:text-white text-sm">
                    Services
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="text-gray-400 hover:text-white text-sm">
                    How it Works
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('technicians')} className="text-gray-400 hover:text-white text-sm">
                    Our Technicians
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('standards')} className="text-gray-400 hover:text-white text-sm">
                    The DIA Standard
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('join')} className="text-gray-400 hover:text-white text-sm">
                    Join DIA
                  </button>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-white mb-4">Our Services</h4>
              <ul className="space-y-2">
                {servicesLoading ? (
                  <>
                    <li><Skeleton className="h-4 w-32" /></li>
                    <li><Skeleton className="h-4 w-28" /></li>
                    <li><Skeleton className="h-4 w-36" /></li>
                  </>
                ) : (
                  services.slice(0, 6).map((service) => (
                    <li key={service.id}>
                      <button 
                        onClick={() => handleBookService(service)}
                        className="text-gray-400 hover:text-[#00C853] text-sm transition-colors"
                      >
                        {service.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* For Technicians */}
            <div>
              <h4 className="font-semibold text-white mb-4">For Technicians</h4>
              <p className="text-gray-400 text-sm mb-4">
                Join our team of professional technicians and grow your career with DIA.
              </p>
              <Link to="/auth/signup">
                <span className="text-[#00C853] hover:text-[#00C853]/80 text-sm font-medium flex items-center gap-2">
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2024 DIA Services. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              DIA is a professional service company. We employ and manage all our technicians.
            </p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        service={selectedService}
        services={services}
      />
    </div>
  );
}
