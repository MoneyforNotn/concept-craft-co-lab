import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session:", !!session);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setCheckingSession(false);
      } else if (event === "SIGNED_IN" && session) {
        // User signed in via recovery link
        setIsRecoveryMode(true);
        setCheckingSession(false);
      }
    });

    const handlePasswordRecovery = async () => {
      try {
        // Check for error parameters in hash FIRST (from failed Supabase verification)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (errorCode) {
          console.log("Error from Supabase:", errorCode, errorDescription);
          if (errorCode === 'otp_expired') {
            setErrorMessage("This password reset link has expired. Reset links are valid for 1 hour. Please request a new one.");
          } else {
            setErrorMessage(errorDescription?.replace(/\+/g, ' ') || "This password reset link is invalid. Please request a new one.");
          }
          setCheckingSession(false);
          return;
        }

        // Check for token_hash in URL (email link verification)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get('token_hash');
        const type = urlParams.get('type');
        
        if (tokenHash && type === 'recovery') {
          console.log("Verifying token_hash...");
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          
          if (!error && data.session) {
            console.log("Token verified successfully");
            setIsRecoveryMode(true);
            setCheckingSession(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.log("Token verification failed:", error);
            setErrorMessage("This password reset link is invalid or has expired. Please request a new one.");
            setCheckingSession(false);
            return;
          }
        }

        // Check for code in URL (PKCE flow)
        const code = urlParams.get('code');
        
        if (code) {
          console.log("Exchanging code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            console.log("Code exchanged successfully");
            setIsRecoveryMode(true);
            setCheckingSession(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.log("Code exchange failed:", error);
          }
        }

        // Check for hash parameters (legacy implicit flow)
        const accessToken = hashParams.get('access_token');
        const hashType = hashParams.get('type');

        if (hashType === 'recovery' && accessToken) {
          console.log("Found recovery token in hash");
          setIsRecoveryMode(true);
          setCheckingSession(false);
          return;
        }

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Existing session check:", !!session);
        if (session) {
          setIsRecoveryMode(true);
          setCheckingSession(false);
          return;
        }
        
        setCheckingSession(false);
      } catch (error) {
        console.error('Error checking recovery status:', error);
        setCheckingSession(false);
      }
    };

    handlePasswordRecovery();

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Validate password inputs
      const validation = passwordSchema.safeParse({ password, confirmPassword });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: validation.data.password,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset. Please sign in with your new password.",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting password",
        description: error.message || "Auth session missing! Please request a new password reset link.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-base">
              {errorMessage || "This password reset link is invalid or has expired. Please request a new one."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full"
            >
              Back to Login
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Click "Forgot password?" on the login page to receive a new reset link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your new password below (minimum 8 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                placeholder="Re-enter your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth")}
              disabled={loading}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
