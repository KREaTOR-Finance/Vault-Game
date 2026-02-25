import { PublicKey } from '@solana/web3.js';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export type MegaChallenge = {
  authority: PublicKey;
  vault: PublicKey;
  bump: number;
};

export function megaChallengePda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('mega_challenge')], VAULT_GAME_PROGRAM_ID);
  return pda;
}

export function decodeMegaChallenge(data: Buffer): MegaChallenge {
  // 8 discriminator + authority(32) + vault(32) + bump(1)
  let o = 8;
  const authority = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const vault = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const bump = data.readUInt8(o);
  return { authority, vault, bump };
}
