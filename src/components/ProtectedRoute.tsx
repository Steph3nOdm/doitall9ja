import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: ('client' | 'technician' | 'admin' | 'support')[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#00C853]" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  if (allowedRoles && !role) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    switch (role) {
      case 'client':
        return <Navigate to="/dashboard/client" replace />;
      case 'technician':
        return <Navigate to="/dashboard/technician" replace />;
      case 'admin':
      case 'support':
        return <Navigate to="/dashboard/admin" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
