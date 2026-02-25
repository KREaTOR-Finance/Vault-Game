import { PublicKey } from '@solana/web3.js';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export function vaultPdaFromId(id: number | bigint): PublicKey {
  const n = typeof id === 'bigint' ? id : BigInt(id);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n);
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), buf], VAULT_GAME_PROGRAM_ID);
  return pda;
}

export type VaultState = {
  creator: PublicKey;
  status: number;
  createdAt: bigint;
  endTs: bigint;
  vaultId: bigint;
  prizeAmount: bigint;
  startingFeeAmount: bigint;
  currentFeeAmount: bigint;
  attemptCount: bigint;
  isSolFee: boolean;
  feeMint: PublicKey;
  totalFeesCollected: bigint;
  winnerFeePool: bigint;
  paidOut: boolean;
  bump: number;
};

function readU64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigUInt64LE(off);
}
function readI64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigInt64LE(off);
}

// Minimal decode for telemetry: we only rely on stable offsets in our own struct.
// Anchor accounts start with an 8-byte discriminator.
export function decodeVault(data: Buffer): VaultState {
  let o = 8;
  const creator = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const status = data.readUInt8(o);
  o += 1;
  const createdAt = readI64LE(data, o);
  o += 8;
  const endTs = readI64LE(data, o);
  o += 8;
  // secret_hash [32]
  o += 32;

  const vaultId = readU64LE(data, o);
  o += 8;

  const prizeAmount = readU64LE(data, o);
  o += 8;

  const startingFeeAmount = readU64LE(data, o);
  o += 8;
  const currentFeeAmount = readU64LE(data, o);
  o += 8;
  const attemptCount = readU64LE(data, o);
  o += 8;
  const isSolFee = data.readUInt8(o) === 1;
  o += 1;
  const feeMint = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const totalFeesCollected = readU64LE(data, o);
  o += 8;
  const winnerFeePool = readU64LE(data, o);
  o += 8;
  // winner: Option<Pubkey> (1 + 32)
  o += 33;
  // settled_at: Option<i64> (1 + 8)
  o += 9;

  const paidOut = data.readUInt8(o) === 1;
  o += 1;

  const bump = data.readUInt8(o);

  return {
    creator,
    status,
    createdAt,
    endTs,
    vaultId,
    prizeAmount,
    startingFeeAmount,
    currentFeeAmount,
    attemptCount,
    isSolFee,
    feeMint,
    totalFeesCollected,
    winnerFeePool,
    paidOut,
    bump,
  };
}
