/* Create a devnet Mega Challenge vault (v0) and point mega_challenge at it.
 *
 * This uses raw Anchor instruction encoding.
 */

const crypto = require('crypto');
const fs = require('fs');
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

function u64LE(n) {
  const bn = BigInt(n);
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(bn, 0);
  return b;
}

function i64LE(n) {
  const bn = BigInt(n);
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(bn, 0);
  return b;
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
  const walletPath = arg('--wallet');
  const feeMint = arg('--feeMint');
  const creatorFeeTokenAccount = arg('--creatorFeeTokenAccount');
  const pinLen = Number(arg('--pinLen') || '4');
  const baseFee = BigInt(arg('--baseFee') || '0');
  const prize = BigInt(arg('--prize') || '0');

  if (!programId) throw new Error('Missing --programId');
  if (!walletPath) throw new Error('Missing --wallet');
  if (!feeMint) throw new Error('Missing --feeMint');
  if (!creatorFeeTokenAccount) throw new Error('Missing --creatorFeeTokenAccount');

  const payer = readKeypair(walletPath);
  const conn = new web3.Connection(url, 'confirmed');

  const [globalState] = web3.PublicKey.findProgramAddressSync([Buffer.from('global')], programId);
  const [megaVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], programId);
  const [megaChallenge] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_challenge')], programId);

  const gsInfo = await conn.getAccountInfo(globalState, 'confirmed');
  if (!gsInfo) throw new Error('GlobalState missing; run devnet-init-raw first');

  // GlobalState layout: disc(8) + authority(32) + skr_mint(32) + vault_count(u64) + bump(u8)
  const data = Buffer.from(gsInfo.data);
  const vaultCount = data.readBigUInt64LE(8 + 32 + 32);

  const vaultIdBytes = Buffer.alloc(8);
  vaultIdBytes.writeBigUInt64LE(vaultCount);

  const [vaultPda] = web3.PublicKey.findProgramAddressSync([
    Buffer.from('vault'),
    vaultIdBytes,
  ], programId);

  const [playerProfile] = web3.PublicKey.findProgramAddressSync([
    Buffer.from('player'),
    payer.publicKey.toBuffer(),
  ], programId);

  const tokenProgram = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const assocTokenProgram = new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const systemProgram = web3.SystemProgram.programId;

  // ATAs owned by PDAs.
  const vaultFeeAta = web3.PublicKey.findProgramAddressSync([
    vaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    new web3.PublicKey(feeMint).toBuffer(),
  ], assocTokenProgram)[0];

  const vaultPrizeAta = web3.PublicKey.findProgramAddressSync([
    vaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    new web3.PublicKey(feeMint).toBuffer(),
  ], assocTokenProgram)[0];

  const megaVaultFeeAta = web3.PublicKey.findProgramAddressSync([
    megaVaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    new web3.PublicKey(feeMint).toBuffer(),
  ], assocTokenProgram)[0];

  // Args: end_ts(i64) + secret_hash[32] + prize(u64) + base_fee(u64) + pin_len(u8) + fee_mint Option<Pubkey>
  const endTs = BigInt(Math.floor(Date.now() / 1000) + 86400);
  const secretHash = crypto.createHash('sha256').update('sigma').digest();
  const feeMintOptSome = Buffer.from([1]);

  const args = concat(
    i64LE(endTs),
    secretHash,
    u64LE(prize),
    u64LE(baseFee),
    Buffer.from([pinLen]),
    feeMintOptSome,
    pkBytes(feeMint)
  );

  const ixData = concat(ixDiscriminator('create_vault'), args);

  const ix = new web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaVaultPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: playerProfile, isSigner: false, isWritable: true },
      { pubkey: new web3.PublicKey(feeMint), isSigner: false, isWritable: false },
      { pubkey: new web3.PublicKey(creatorFeeTokenAccount), isSigner: false, isWritable: true },
      { pubkey: vaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultPrizeAta, isSigner: false, isWritable: true },
      { pubkey: megaVaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: assocTokenProgram, isSigner: false, isWritable: false },
      { pubkey: systemProgram, isSigner: false, isWritable: false },
    ],
    data: ixData,
  });

  // Now set mega challenge pointer to this vault.
  const setData = concat(ixDiscriminator('set_mega_challenge_vault'), pkBytes(vaultPda));
  const setIx = new web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaChallenge, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: systemProgram, isSigner: false, isWritable: false },
    ],
    data: setData,
  });

  const tx = new web3.Transaction().add(ix, setIx);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  console.log('creating vaultPda', vaultPda.toBase58(), 'vaultCount', vaultCount.toString());

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
  console.log('tx sig', sig);
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('confirmed');
  console.log('MEGA_CHALLENGE_VAULT', vaultPda.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
