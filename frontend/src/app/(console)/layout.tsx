'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import ConsoleFrame from '@/components/console/ConsoleFrame';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { connected } = useWallet();
  const disconnectTimer = useRef<number | null>(null);

  // Hard gate: nobody plays while disconnected.
  // Debounce to avoid flicker/redirect loops during mobile wallet handshakes.
  useEffect(() => {
    if (disconnectTimer.current) {
      window.clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }

    if (connected) return;

    disconnectTimer.current = window.setTimeout(() => {
      router.replace('/');
    }, 650);

    return () => {
      if (disconnectTimer.current) {
        window.clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
    };
  }, [connected, router]);

  if (!connected) return null;

  return <ConsoleFrame>{children}</ConsoleFrame>;
}
