/* Devnet bootstrap for Vault-Game (new program).
 * - initialize_global(skr_mint)
 * - set_mega_challenge_vault(vault)
 *
 * Usage:
 *   node scripts/devnet-init.js --skrMint <mint> --megaVault <vaultPubkey>
 */

const fs = require('fs');
const path = require('path');
const anchor = require('@coral-xyz/anchor');
const web3 = require('@solana/web3.js');

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

async function main() {
  const skrMint = arg('--skrMint');
  const megaVault = arg('--megaVault');
  if (!skrMint) throw new Error('Missing --skrMint');
  if (!megaVault) throw new Error('Missing --megaVault');

  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'vault_game.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

  const programId = new web3.PublicKey(idl.address);
  const url = 'https://api.devnet.solana.com';

  // Use Solana CLI keypair (we already set it to clawd-dev-wallet.json)
  const provider = anchor.AnchorProvider.local(url, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, programId, provider);

  const [globalPda] = web3.PublicKey.findProgramAddressSync([
    Buffer.from('global'),
  ], programId);

  const [megaVaultPda] = web3.PublicKey.findProgramAddressSync([
    Buffer.from('mega_vault'),
  ], programId);

  const [megaChallengePda] = web3.PublicKey.findProgramAddressSync([
    Buffer.from('mega_challenge'),
  ], programId);

  console.log('programId', programId.toBase58());
  console.log('authority', provider.wallet.publicKey.toBase58());
  console.log('globalPda', globalPda.toBase58());
  console.log('megaVaultPda', megaVaultPda.toBase58());
  console.log('megaChallengePda', megaChallengePda.toBase58());

  // initialize_global
  console.log('→ initialize_global', skrMint);
  const sig1 = await program.methods
    .initializeGlobal(new web3.PublicKey(skrMint))
    .accounts({
      globalState: globalPda,
      megaVault: megaVaultPda,
      authority: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  console.log('initialize_global sig', sig1);

  // set_mega_challenge_vault
  console.log('→ set_mega_challenge_vault', megaVault);
  const sig2 = await program.methods
    .setMegaChallengeVault(new web3.PublicKey(megaVault))
    .accounts({
      globalState: globalPda,
      megaChallenge: megaChallengePda,
      authority: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  console.log('set_mega_challenge_vault sig', sig2);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
