'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { LogOut, Settings, User as UserIcon, ChevronDown, Loader2 } from 'lucide-react';

import { useMemo } from 'react';

export function UserProfileMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const checkNavigationReturn = async () => {
      const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
      if (oauthInProgress) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsSigningIn(false);
          sessionStorage.removeItem('oauth_in_progress');
          setErrorMsg('Login was cancelled or interrupted.');
          setShowErrorDialog(true);
        } else {
          sessionStorage.removeItem('oauth_in_progress');
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsSigningIn(false);
        checkNavigationReturn();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNavigationReturn();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const getInitialSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errParam = params.get('error');
        if (errParam) {
          if (errParam === 'auth-callback-failed') {
            setErrorMsg('Authentication failed. Please try again or use a different account.');
          } else {
            setErrorMsg('Access denied or login cancelled.');
          }
          setShowErrorDialog(true);
          window.history.replaceState({}, document.title, window.location.pathname);
          sessionStorage.removeItem('oauth_in_progress');
        }

        const { data: { session } } = await supabase.auth.getSession();
        checkNavigationReturn();

        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    sessionStorage.setItem('oauth_in_progress', 'true');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setIsSigningIn(false);
      setErrorMsg(err.message || 'Failed to initialize sign in');
      setShowErrorDialog(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const renderErrorDialog = () => (
    <AlertDialog open={showErrorDialog} onOpenChange={(open) => {
      setShowErrorDialog(open);
      if (!open) window.location.reload();
    }}>
      <AlertDialogContent className="bg-[#121417] border-white/10 text-white sm:max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-400">Sign In Failed</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {errorMsg}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={() => {
              setShowErrorDialog(false);
              window.location.reload();
            }} 
            className="bg-white/10 text-white hover:bg-white/20 border-none"
          >
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>;
  }

  if (!user) {
    return (
      <>
        <Button 
          onClick={handleSignIn} 
          disabled={isSigningIn}
          variant="secondary" 
          className="rounded-full px-6 font-semibold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 bg-primary text-white hover:bg-primary/90 border-none min-w-[100px]"
        >
          {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </Button>
        {renderErrorDialog()}
      </>
    );
  }

  const fullName = user.user_metadata?.full_name || 'User';
  const firstName = fullName.split(' ')[0].toLowerCase();
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || '';
  const userId = user.id.split('-')[0].toUpperCase();
  const joinedAt = new Date(user.created_at).toLocaleDateString('en-GB');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <button className="h-10 w-10 rounded-full border border-white/20 hover:border-white/40 transition-all outline-none overflow-hidden ring-0 focus-visible:ring-0">
          <Avatar className="h-full w-full">
            <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{fullName.charAt(0)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-[#121417] border-white/5 text-white rounded-3xl shadow-2xl mt-2 p-0 overflow-hidden ring-1 ring-white/10" align="end" sideOffset={8}>
        <div className="p-8 bg-gradient-to-b from-white/[0.03] to-transparent flex flex-col items-center gap-4">
          <div className="relative">
             <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 to-transparent rounded-full blur-sm opacity-50"></div>
             <Avatar className="h-24 w-24 border-2 border-white/10 shadow-2xl relative">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">{fullName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center space-y-2 w-full">
            <div className="space-y-1 mt-2">
              <p className="text-sm text-zinc-300 font-semibold tracking-tight">{fullName}</p>
              <p className="text-sm text-zinc-400 font-medium tracking-tight truncate px-4">{email}</p>
              <p className="text-xs text-zinc-500 pt-2 font-medium">Joined: {joinedAt}</p>
            </div>
          </div>
        </div>
        
        <div className="px-3 pb-4">
          <div className="h-[1px] bg-white/5 w-full mb-3" />
          
          <div className="space-y-1">
            <DropdownMenuItem 
              onClick={() => setShowLogoutDialog(true)} 
              className="cursor-pointer hover:bg-zinc-800 data-[highlighted]:bg-zinc-800 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center"
            >
              <LogOut className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              <span className="font-medium group-hover:text-white transition-colors">Logout</span>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <AlertDialogContent className="bg-[#121417] border-white/10 text-white sm:max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            You will need to sign in again to access your account and usage history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-none hover:bg-white/10 text-white hover:text-white mt-2 sm:mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSignOut} 
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
          >
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    {renderErrorDialog()}
    </>
  );
}
