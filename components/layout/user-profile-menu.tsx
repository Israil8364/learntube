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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { LogOut, Settings, User as UserIcon, Trash2, Ban, Paintbrush, ChevronDown } from 'lucide-react';

import { useMemo } from 'react';

export function UserProfileMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
    };
  }, [supabase]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>;
  }

  if (!user) {
    return (
      <Button onClick={handleSignIn} variant="secondary" className="rounded-full px-6 font-semibold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 bg-primary text-white hover:bg-primary/90 border-none">
        Sign In
      </Button>
    );
  }

  const fullName = user.user_metadata?.full_name || 'User';
  const firstName = fullName.split(' ')[0].toLowerCase();
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || '';
  const userId = user.id.split('-')[0].toUpperCase();
  const joinedAt = new Date(user.created_at).toLocaleDateString('en-GB');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 px-1 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group flex items-center gap-3 pr-4 outline-none ring-0 focus-visible:ring-0">
          <Avatar className="h-8 w-8 border border-white/20">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{firstName} {fullName.split(' ')[1]?.toLowerCase() || ''}</span>
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-all group-data-[state=open]:rotate-180" />
        </Button>
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
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium tracking-tight">ID: {userId}</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(user.id);
                  // Optional: add a tiny toast or state change for "Copied!"
                }}
                className="text-primary hover:text-primary/80 text-[11px] font-bold transition-colors"
              >
                Copy ID
              </button>
            </div>
            
            <div className="space-y-0.5">
              <p className="text-sm text-zinc-400 font-medium tracking-tight">Name: {fullName.toLowerCase()}</p>
              <p className="text-sm text-zinc-400 font-medium tracking-tight truncate px-4">Email: {email}</p>
              <div className="flex gap-4 items-center justify-center text-[13px] text-zinc-500 pt-1 font-medium">
                <span>Followers: 0</span>
                <span>Friends: 0</span>
                <span>Following: 0</span>
              </div>
              <p className="text-[11px] text-zinc-600 pt-2 font-medium">Created At: {joinedAt} 10:23 PM</p>
            </div>
          </div>
        </div>
        
        <div className="px-3 pb-4">
          <div className="h-[1px] bg-white/5 w-full mb-3" />
          
          <div className="space-y-1">
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 data-[highlighted]:bg-white/5 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <UserIcon className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-primary transition-colors" />
              <span className="font-medium">My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 data-[highlighted]:bg-white/5 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <Settings className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-primary transition-colors" />
              <span className="font-medium">Supporter Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 data-[highlighted]:bg-white/5 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <Paintbrush className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-primary transition-colors" />
              <span className="font-medium">Theme Settings</span>
            </DropdownMenuItem>
            
            <div className="h-[1px] bg-white/5 w-full my-2 mx-4" />
            
            <DropdownMenuItem className="cursor-pointer hover:bg-red-500/10 data-[highlighted]:bg-red-500/10 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <Ban className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
              <span className="font-medium group-hover:text-red-400 transition-colors">Self-Ban Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-red-500/10 data-[highlighted]:bg-red-500/10 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <Trash2 className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
              <span className="font-medium group-hover:text-red-400 transition-colors">Delete Account</span>
            </DropdownMenuItem>
            
            <div className="h-[1px] bg-white/5 w-full my-2 mx-4" />
            
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer hover:bg-zinc-800 data-[highlighted]:bg-zinc-800 rounded-2xl text-[14px] text-zinc-300 py-3 px-4 outline-none transition-all group flex items-center">
              <LogOut className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              <span className="font-medium group-hover:text-white transition-colors">Logout</span>
            </DropdownMenuItem>
          </div>
        </div>
        
        <div className="bg-black/20 p-4 pt-2 flex justify-center items-center">
          <p className="text-[11px] text-zinc-700 font-medium tracking-tight">Version 5.7.7 build 1</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
