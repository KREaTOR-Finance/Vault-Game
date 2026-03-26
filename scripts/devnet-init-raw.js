/* Raw devnet bootstrap (no Anchor JS IDL dependency).
 *
 * Sends:
 *  1) initialize_global(skr_mint)
 *  2) set_mega_challenge_vault(vault)
 *
 * Uses Anchor 8-byte instruction discriminators:
 *  sha256("global:<ix_name>").slice(0,8)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const web3 = require('@solana/web3.js');

function ixDiscriminator(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function readKeypair(file) {
  const secret = JSON.parse(fs.readFileSync(file, 'utf8'));
  return web3.Keypair.fromSecretKey(Uint8Array.from(secret));
}

function pkBytes(pubkey) {
  return new web3.PublicKey(pubkey).toBytes();
}

function concat(...bufs) {
  return Buffer.concat(bufs.map((b) => Buffer.from(b)));
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

async function main() {
  const url = 'https://api.devnet.solana.com';
  const programId = new web3.PublicKey(arg('--programId'));
  const skrMint = arg('--skrMint');
  const megaVault = arg('--megaVault');
  const walletPath = arg('--wallet') || process.env.ANCHOR_WALLET;

  if (!programId) throw new Error('Missing --programId');
  if (!skrMint) throw new Error('Missing --skrMint');
  if (!megaVault) throw new Error('Missing --megaVault');
  if (!walletPath) throw new Error('Missing --wallet or ANCHOR_WALLET');

  const payer = readKeypair(walletPath);
  const conn = new web3.Connection(url, 'confirmed');

  const [globalState] = web3.PublicKey.findProgramAddressSync([Buffer.from('global')], programId);
  const [megaVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], programId);
  const [megaChallenge] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_challenge')], programId);

  console.log('programId', programId.toBase58());
  console.log('payer', payer.publicKey.toBase58());
  console.log('globalState', globalState.toBase58());
  console.log('megaVaultPda', megaVaultPda.toBase58());
  console.log('megaChallenge', megaChallenge.toBase58());

  // initialize_global(skr_mint: Pubkey)
  const initData = concat(ixDiscriminator('initialize_global'), pkBytes(skrMint));
  const initIx = new web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaVaultPda, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
  });

  // set_mega_challenge_vault(vault: Pubkey)
  const setData = concat(ixDiscriminator('set_mega_challenge_vault'), pkBytes(megaVault));
  const setIx = new web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaChallenge, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: setData,
  });

  const tx = new web3.Transaction().add(initIx, setIx);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
  console.log('bootstrap tx sig', sig);
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('confirmed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
