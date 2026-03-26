'use client';

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';

// Default styles for WalletMultiButton modal
import '@solana/wallet-adapter-react-ui/styles.css';

export default function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  const wallets = useMemo(() => {
    const handleNotFound = createDefaultWalletNotFoundHandler();
    return [
      // Solana Mobile (SeedVault) / MWA
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        // MWA requires a secure origin and a chain.
        chain: 'solana:devnet',
        onWalletNotFound: async (mobileWalletAdapter) =>
          handleNotFound(
            mobileWalletAdapter as unknown as Parameters<typeof handleNotFound>[0]
          ),
        appIdentity: {
          name: 'VaultCrack',
          uri: 'https://vault-game.local',
        },
      }),
    ];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
