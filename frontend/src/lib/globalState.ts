import { PublicKey } from '@solana/web3.js';

export type GlobalState = {
  authority: PublicKey;
  skrMint: PublicKey;
  vaultCount: bigint;
  bump: number;
};

// Anchor accounts start with an 8-byte discriminator.
export function decodeGlobalState(data: Buffer): GlobalState {
  let o = 8;
  const authority = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const skrMint = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  // eslint-disable-next-line no-undef
  const vaultCount = data.readBigUInt64LE(o);
  o += 8;
  const bump = data.readUInt8(o);
  return { authority, skrMint, vaultCount, bump };
}
