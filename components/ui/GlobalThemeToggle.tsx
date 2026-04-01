'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';

export default function GlobalThemeToggle() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 4000,
      }}
    >
      <ThemeToggle />
    </div>
  );
}
