import { PublicKey } from '@solana/web3.js';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export type PlayerRetention = {
  authority: PublicKey;
  lastPlayDay: bigint;
  freeTryDay: bigint;
  streakDays: number;
  xp: bigint;
  plays: bigint;
  bump: number;
};

export function playerRetentionPda(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('retention'), authority.toBuffer()],
    VAULT_GAME_PROGRAM_ID
  );
  return pda;
}

function readI64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigInt64LE(off);
}

function readU64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigUInt64LE(off);
}

export function decodePlayerRetention(data: Buffer): PlayerRetention {
  let o = 8;
  const authority = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const lastPlayDay = readI64LE(data, o);
  o += 8;
  const freeTryDay = readI64LE(data, o);
  o += 8;
  const streakDays = data.readUInt32LE(o);
  o += 4;
  const xp = readU64LE(data, o);
  o += 8;
  const plays = readU64LE(data, o);
  o += 8;
  const bump = data.readUInt8(o);

  return {
    authority,
    lastPlayDay,
    freeTryDay,
    streakDays,
    xp,
    plays,
    bump,
  };
}

