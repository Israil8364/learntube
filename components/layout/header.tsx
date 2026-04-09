'use client';

import Link from 'next/link';
import { UserProfileMenu } from './user-profile-menu';

export function Header() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-end px-6 py-4 pointer-events-none">
      <div className="pointer-events-auto">
        <UserProfileMenu />
      </div>
    </div>
  );
}
