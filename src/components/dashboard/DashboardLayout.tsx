import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: string;
}

export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'client':
        return 'bg-blue-500/20 text-blue-400';
      case 'technician':
        return 'bg-[#00C853]/20 text-[#00C853]';
      case 'admin':
      case 'support':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1a1a1a] border-r border-gray-800 fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">DIA</span>
            <span className="text-xs text-gray-400">Do It All</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/30'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <Badge className="bg-[#00C853] text-black text-xs">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-[#00C853]/20 text-[#00C853]">
                    {getInitials(profile?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#2a2a2a] border-gray-700">
              <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem 
                onClick={() => navigate('/dashboard/profile')}
                className="text-gray-300 hover:text-white hover:bg-[#3a3a3a] cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/dashboard/settings')}
                className="text-gray-300 hover:text-white hover:bg-[#3a3a3a] cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-[#1a1a1a] border-gray-800 p-0">
                <div className="p-6 border-b border-gray-800">
                  <Link to="/" className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">DIA</span>
                    <span className="text-xs text-gray-400">Do It All</span>
                  </Link>
                </div>
                <nav className="p-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <Badge className="bg-[#00C853] text-black text-xs ml-auto">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Page Title - Mobile */}
            <div className="lg:hidden">
              <Badge className={`${getRoleColor()} capitalize`}>
                {userRole}
              </Badge>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 bg-[#00C853] text-black text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-[#2a2a2a] border-gray-700">
                  <DropdownMenuLabel className="text-white flex items-center justify-between">
                    Notifications
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs text-[#00C853] hover:text-[#00C853]/80"
                      >
                        Mark all read
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <DropdownMenuItem className="text-gray-400 text-sm py-4 text-center">
                        No notifications yet
                      </DropdownMenuItem>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-300 hover:text-white hover:bg-[#3a3a3a] cursor-pointer py-3"
                        >
                          <div className="w-full">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{notification.title}</p>
                              {!notification.is_read && (
                                <span className="h-2 w-2 rounded-full bg-[#00C853] flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Profile */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-[#00C853]/20 text-[#00C853] text-sm">
                          {getInitials(profile?.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#2a2a2a] border-gray-700">
                    <DropdownMenuLabel className="text-white">{profile?.full_name}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard/profile')}
                      className="text-gray-300 hover:text-white hover:bg-[#3a3a3a] cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
