import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ensureSupabaseConfigured, supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reference = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('reference') || params.get('trxref');
  }, [location.search]);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setError('Missing payment reference');
        setIsVerifying(false);
        return;
      }

      setError('');
      setSuccess('');
      setIsVerifying(true);

      try {
        ensureSupabaseConfigured();
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.message || 'Payment verification failed');
        }

        setSuccess('Payment verified successfully. Your booking is now marked as paid.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify payment');
      } finally {
        setIsVerifying(false);
      }
    };

    void verifyPayment();
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] px-4 py-12">
      <Card className="bg-[#1a1a1a] border-gray-800 max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-white">Payment Status</CardTitle>
          <CardDescription className="text-gray-400">
            We are confirming your payment with Paystack.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVerifying && (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin text-[#00C853]" />
              Verifying payment...
            </div>
          )}

          {success && (
            <Alert className="bg-[#00C853]/10 border-[#00C853]/40">
              <CheckCircle className="h-4 w-4 text-[#00C853]" />
              <AlertDescription className="text-[#00C853]">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-900/20 border-red-800">
              <XCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
              <Link to="/dashboard/client/bookings">Go to My Bookings</Link>
            </Button>
            {error && (
              <Button asChild variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#2a2a2a] hover:text-white">
                <Link to="/">Back to Home</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
