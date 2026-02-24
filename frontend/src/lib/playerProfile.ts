import { PublicKey } from '@solana/web3.js';

// Program id (Anchor declare_id!)
export const VAULT_GAME_PROGRAM_ID = new PublicKey('B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t');

export type PlayerProfile = {
  authority: PublicKey;
  attempts: bigint;
  wins: bigint;
  vaultsCreated: bigint;
  score: bigint;
  lastSeenTs: bigint;
  bump: number;
};

export function playerProfilePda(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), authority.toBuffer()],
    VAULT_GAME_PROGRAM_ID
  );
  return pda;
}

function readU64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigUInt64LE(off);
}

function readI64LE(buf: Buffer, off: number): bigint {
  // eslint-disable-next-line no-undef
  return buf.readBigInt64LE(off);
}

// Anchor accounts start with an 8-byte discriminator.
export function decodePlayerProfile(data: Buffer): PlayerProfile {
  let o = 8;
  const authority = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const attempts = readU64LE(data, o);
  o += 8;
  const wins = readU64LE(data, o);
  o += 8;
  const vaultsCreated = readU64LE(data, o);
  o += 8;
  const score = readU64LE(data, o);
  o += 8;
  const lastSeenTs = readI64LE(data, o);
  o += 8;
  const bump = data.readUInt8(o);

  return { authority, attempts, wins, vaultsCreated, score, lastSeenTs, bump };
}
