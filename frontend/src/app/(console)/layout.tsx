'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import ConsoleFrame from '@/components/console/ConsoleFrame';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { connected } = useWallet();

  // Hard gate: nobody plays while disconnected.
  useEffect(() => {
    if (connected) return;
    router.replace('/');
  }, [connected, router]);

  if (!connected) return null;

  return <ConsoleFrame>{children}</ConsoleFrame>;
}
