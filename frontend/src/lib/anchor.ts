import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { playerProfilePda, VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export function megaVaultPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], VAULT_GAME_PROGRAM_ID);
  return pda;
}

export function associatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return pda;
}

export function globalStatePda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('global')], VAULT_GAME_PROGRAM_ID);
  return pda;
}

export function vaultPdaFromCount(vaultCount: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(vaultCount);
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), buf], VAULT_GAME_PROGRAM_ID);
  return pda;
}

// Anchor instruction discriminator: sha256("global:<ix_name>")[0..8]
export async function anchorDiscriminator(ixName: string): Promise<Buffer> {
  const preimage = new TextEncoder().encode(`global:${ixName}`);
  const hash = await crypto.subtle.digest('SHA-256', preimage);
  return Buffer.from(hash).subarray(0, 8);
}

export async function touchPlayerIx(player: PublicKey): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator('touch_player');
  const playerProfile = playerProfilePda(player);

  return new TransactionInstruction({
    programId: VAULT_GAME_PROGRAM_ID,
    keys: [
      { pubkey: playerProfile, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: disc,
  });
}

function i64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  // eslint-disable-next-line no-undef
  b.writeBigInt64LE(n);
  return b;
}

function u64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  // eslint-disable-next-line no-undef
  b.writeBigUInt64LE(n);
  return b;
}

export async function createVaultIx(args: {
  creator: PublicKey;
  skrMint: PublicKey;
  vaultCount: bigint;
  endTs: bigint;
  secretHash: Buffer; // 32
  prizeAmount: bigint;
  baseFeeAmount: bigint;
  pinLen: number;
}): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator('create_vault');
  const globalState = globalStatePda();
  const vault = vaultPdaFromCount(args.vaultCount);
  const playerProfile = playerProfilePda(args.creator);

  // CreateVaultArgs layout (Anchor/Borsh):
  // end_ts i64
  // secret_hash [32]
  // prize_amount u64
  // base_fee_amount u64
  // pin_len u8
  // fee_mint Option<Pubkey>  (tag u8 + pubkey[32])
  const feeMintTag = Buffer.from([1]);
  const feeMintBytes = args.skrMint.toBuffer();

  const data = Buffer.concat([
    disc,
    i64LE(args.endTs),
    args.secretHash,
    u64LE(args.prizeAmount),
    u64LE(args.baseFeeAmount),
    Buffer.from([args.pinLen & 0xff]),
    feeMintTag,
    feeMintBytes,
  ]);

  const megaVault = megaVaultPda();
  const creatorFeeAta = associatedTokenAddress(args.skrMint, args.creator);
  const vaultFeeAta = associatedTokenAddress(args.skrMint, vault);
  const vaultPrizeAta = associatedTokenAddress(args.skrMint, vault);
  const megaVaultFeeAta = associatedTokenAddress(args.skrMint, megaVault);

  return new TransactionInstruction({
    programId: VAULT_GAME_PROGRAM_ID,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaVault, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: playerProfile, isSigner: false, isWritable: true },
      { pubkey: args.skrMint, isSigner: false, isWritable: false },
      { pubkey: creatorFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultPrizeAta, isSigner: false, isWritable: true },
      { pubkey: megaVaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: args.creator, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
