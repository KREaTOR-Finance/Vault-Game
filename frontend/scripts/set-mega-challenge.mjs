import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';
const KEYPAIR_PATH =
  process.env.SOLANA_KEYPAIR ??
  'C:/Users/Buidl/clawd/vault-game/.secrets/devnet-authority.json';

const PROGRAM_ID = new PublicKey('B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t');

const VAULT = new PublicKey(process.env.MEGA_VAULT ?? '2fZo5AKKnzy9NrTckCqsqYNmMPpbrZD5xGrBAWJG3ZcF');

function loadKeypair(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const secret = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secret);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

function discriminator(ixName) {
  const preimage = Buffer.from(`global:${ixName}`, 'utf8');
  return sha256(preimage).subarray(0, 8);
}

function globalStatePda() {
  return PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)[0];
}

function megaChallengePda() {
  return PublicKey.findProgramAddressSync([Buffer.from('mega_challenge')], PROGRAM_ID)[0];
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  const authority = loadKeypair(KEYPAIR_PATH);

  const gs = globalStatePda();
  const mc = megaChallengePda();

  const disc = discriminator('set_mega_challenge_vault');
  const data = Buffer.concat([disc, VAULT.toBuffer()]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gs, isSigner: false, isWritable: true },
      { pubkey: mc, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [authority], { preflightCommitment: 'confirmed' });
  await connection.confirmTransaction(sig, 'confirmed');

  console.log('set_mega_challenge_vault sig:', sig);
  console.log('MegaChallenge PDA:', mc.toBase58());
  console.log('Mega vault set to:', VAULT.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
