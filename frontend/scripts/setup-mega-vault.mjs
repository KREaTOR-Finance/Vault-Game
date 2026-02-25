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

// ---- Config ----
const RPC = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';
const KEYPAIR_PATH =
  process.env.SOLANA_KEYPAIR ??
  'C:/Users/Buidl/clawd/vault-game/.secrets/devnet-authority.json';

const PROGRAM_ID = new PublicKey('B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// VC mint created earlier
const VC_MINT = new PublicKey(process.env.VC_MINT ?? '5TAhT7NySjQdWrb4VfPTXZkG5gJmQxGc2GcRopwKD2Ni');
const VC_DECIMALS = 6;

// Mega vault params
const PIN = (process.env.MEGA_PIN ?? '').trim() || String(Math.floor(10000000 + Math.random() * 90000000)); // 8 digits
const PRIZE_VC = BigInt(process.env.MEGA_PRIZE_VC ?? '500000');
const BASE_FEE_VC = BigInt(process.env.MEGA_BASE_FEE_VC ?? '1');
const DURATION_YEARS = Number(process.env.MEGA_DURATION_YEARS ?? '25');

function loadKeypair(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const secret = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secret);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

function u64LE(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function i64LE(n) {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n));
  return b;
}

function discriminator(ixName) {
  // Anchor instruction discriminator: sha256("global:<name>")[0..8]
  const preimage = Buffer.from(`global:${ixName}`, 'utf8');
  return sha256(preimage).subarray(0, 8);
}

function globalStatePda() {
  return PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)[0];
}

function megaVaultPda() {
  return PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], PROGRAM_ID)[0];
}

function vaultPdaFromCount(vaultCountBig) {
  const buf = u64LE(vaultCountBig);
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), buf], PROGRAM_ID)[0];
}

function playerProfilePda(authority) {
  return PublicKey.findProgramAddressSync([Buffer.from('player'), authority.toBuffer()], PROGRAM_ID)[0];
}

function associatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function decodeGlobalState(data) {
  // discriminator(8) + authority(32) + skr_mint(32) + vault_count(u64) + bump(u8)
  let o = 8 + 32 + 32;
  const vaultCount = data.readBigUInt64LE(o);
  return { vaultCount };
}

async function sendAndConfirm(connection, tx, signers) {
  const sig = await connection.sendTransaction(tx, signers, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  const kp = loadKeypair(KEYPAIR_PATH);

  console.log('RPC:', RPC);
  console.log('Authority:', kp.publicKey.toBase58());
  console.log('VC_MINT:', VC_MINT.toBase58());

  // 1) initialize_global (idempotent-ish: will fail if already initialized)
  const gs = globalStatePda();
  const mv = megaVaultPda();

  const initData = Buffer.concat([discriminator('initialize_global'), VC_MINT.toBuffer()]);
  const initIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gs, isSigner: false, isWritable: true },
      { pubkey: mv, isSigner: false, isWritable: true },
      { pubkey: kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
  });

  const gsInfo = await connection.getAccountInfo(gs, 'confirmed');
  if (!gsInfo) {
    const tx = new Transaction().add(initIx);
    const sig = await sendAndConfirm(connection, tx, [kp]);
    console.log('initialize_global sig:', sig);
  } else {
    console.log('global_state already exists:', gs.toBase58());
  }

  // 2) fetch vault_count
  const gsInfo2 = await connection.getAccountInfo(gs, 'confirmed');
  if (!gsInfo2?.data) throw new Error('global_state missing after init');
  const { vaultCount } = decodeGlobalState(Buffer.from(gsInfo2.data));
  console.log('vault_count:', vaultCount.toString());

  // 3) create mega vault (pin_len=8)
  const vault = vaultPdaFromCount(vaultCount);
  const playerProfile = playerProfilePda(kp.publicKey);

  const creatorFeeAta = associatedTokenAddress(VC_MINT, kp.publicKey);
  const vaultFeeAta = associatedTokenAddress(VC_MINT, vault);
  const vaultPrizeAta = associatedTokenAddress(VC_MINT, vault);
  const megaVaultFeeAta = associatedTokenAddress(VC_MINT, mv);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const endTs = now + BigInt(Math.floor(DURATION_YEARS * 365.25 * 24 * 3600));

  const secretHash = sha256(Buffer.from(PIN, 'utf8'));

  const prizeAmountBaseUnits = PRIZE_VC * BigInt(10 ** VC_DECIMALS);
  const baseFeeAmountBaseUnits = BASE_FEE_VC * BigInt(10 ** VC_DECIMALS);

  // CreateVaultArgs (borsh):
  // end_ts i64
  // secret_hash [32]
  // prize_amount u64
  // base_fee_amount u64
  // pin_len u8
  // fee_mint Option<Pubkey>  (tag u8 + pubkey[32])
  const data = Buffer.concat([
    discriminator('create_vault'),
    i64LE(endTs),
    secretHash,
    u64LE(prizeAmountBaseUnits),
    u64LE(baseFeeAmountBaseUnits),
    Buffer.from([8]),
    Buffer.from([1]),
    VC_MINT.toBuffer(),
  ]);

  const createIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gs, isSigner: false, isWritable: true },
      { pubkey: mv, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: playerProfile, isSigner: false, isWritable: true },
      { pubkey: VC_MINT, isSigner: false, isWritable: false },
      { pubkey: creatorFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultPrizeAta, isSigner: false, isWritable: true },
      { pubkey: megaVaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: kp.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const vaultInfo = await connection.getAccountInfo(vault, 'confirmed');
  if (vaultInfo) {
    console.log('vault already exists (not recreating):', vault.toBase58());
  } else {
    const tx = new Transaction().add(createIx);
    const sig = await sendAndConfirm(connection, tx, [kp]);
    console.log('create_vault sig:', sig);
  }

  console.log('MEGA VAULT PDA:', vault.toBase58());
  console.log('MEGA PIN (8 digits):', PIN);
  console.log('PRIZE (base units):', prizeAmountBaseUnits.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
