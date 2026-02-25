'use client';

import { useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { anchorDiscriminator, globalStatePda, megaVaultPda } from '@/lib/anchor';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export default function AdminPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mint, setMint] = useState('');
  const [megaVault, setMegaVault] = useState('');
  const [status, setStatus] = useState('');

  const globalState = useMemo(() => globalStatePda(), []);
  const megaVaultPdaKey = useMemo(() => megaVaultPda(), []);

  async function initialize() {
    if (!publicKey) {
      setStatus('WALLET NOT CONNECTED');
      return;
    }

    let vcMint: PublicKey;
    try {
      vcMint = new PublicKey(mint);
    } catch {
      setStatus('BAD MINT ADDRESS');
      return;
    }

    try {
      setStatus('INITIALIZING GLOBAL STATE…');

      const disc = await anchorDiscriminator('initialize_global');
      const data = Buffer.concat([disc, vcMint.toBuffer()]);

      const ix = new TransactionInstruction({
        programId: VAULT_GAME_PROGRAM_ID,
        keys: [
          { pubkey: globalState, isSigner: false, isWritable: true },
          { pubkey: megaVaultPdaKey, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      setStatus(`GLOBAL INITIALIZED: ${sig}`);
    } catch {
      setStatus('INIT FAILED');
    }
  }

  async function setMega() {
    if (!publicKey) {
      setStatus('WALLET NOT CONNECTED');
      return;
    }

    let megaPk: PublicKey;
    try {
      megaPk = new PublicKey(megaVault);
    } catch {
      setStatus('BAD MEGA VAULT ADDRESS');
      return;
    }

    try {
      setStatus('SETTING MEGA CHALLENGE VAULT…');

      const disc = await anchorDiscriminator('set_mega_challenge_vault');
      const data = Buffer.concat([disc, megaPk.toBuffer()]);

      const ix = new TransactionInstruction({
        programId: VAULT_GAME_PROGRAM_ID,
        keys: [
          { pubkey: globalState, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      setStatus(`MEGA SET: ${sig}`);
    } catch {
      setStatus('SET MEGA FAILED');
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">ADMIN</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        Devnet helper. Initialize GlobalState + MegaVault PDA.
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="text-xs tracking-widest text-matrix-dim">[ VC MINT ]</div>
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="VC mint address (devnet)"
          value={mint}
          onChange={(e) => setMint(e.target.value.trim())}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-bracket" type="button" onClick={initialize}>
            INITIALIZE GLOBAL
          </button>
        </div>

        <div className="mt-6 text-xs tracking-widest text-matrix-dim">[ MEGA CHALLENGE VAULT ]</div>
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="Mega vault PDA"
          value={megaVault}
          onChange={(e) => setMegaVault(e.target.value.trim())}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-bracket" type="button" onClick={setMega}>
            SET MEGA VAULT
          </button>
        </div>
      </div>

      {status ? (
        <div className="border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">
          {status}
        </div>
      ) : null}

      <div className="text-xs text-matrix-dim/70">
        GlobalState PDA: <span className="font-mono">{globalState.toBase58()}</span>
        <br />
        MegaVault PDA: <span className="font-mono">{megaVaultPdaKey.toBase58()}</span>
      </div>
    </div>
  );
}
