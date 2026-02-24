import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { playerProfilePda, VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

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
