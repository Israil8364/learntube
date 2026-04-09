'use client';

import Link from 'next/link';
import { UserProfileMenu } from './user-profile-menu';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end px-6 py-4 bg-background/50 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-4">
        {/* You can add more global nav items here if needed eventually */}
        <UserProfileMenu />
      </div>
    </header>
  );
}
