/* Create a single devnet vault with a plaintext secret (hashed client-side) and chosen pin_len.
 * Also optionally set it as the Mega Challenge vault.
 *
 * Usage:
 *  node scripts/devnet-create-vault.js \
 *    --programId <PROGRAM_ID> \
 *    --wallet <KEYPAIR_JSON> \
 *    --feeMint <DEVNET_SKR_MINT> \
 *    --creatorFeeTokenAccount <TOKEN_ACCOUNT> \
 *    --secret <string> \
 *    --pinLen <3|4|5|6|8> \
 *    --baseFee <u64> \
 *    --prize <u64> \
 *    [--setMega true]
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

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] || def;
}

function readGlobalVaultCount(gsBytes) {
  // disc(8) + authority(32) + skr_mint(32) + vault_count(u64)
  const off = 8 + 32 + 32;
  return Buffer.from(gsBytes).readBigUInt64LE(off);
}

async function main() {
  const programId = arg('--programId');
  const wallet = arg('--wallet');
  const feeMint = arg('--feeMint');
  const creatorFeeTokenAccount = arg('--creatorFeeTokenAccount');
  const secret = arg('--secret');
  const pinLen = Number(arg('--pinLen', '4'));
  const baseFee = BigInt(arg('--baseFee', '0'));
  const prize = BigInt(arg('--prize', '0'));
  const setMega = arg('--setMega', 'false') === 'true';

  if (!programId || !wallet || !feeMint || !creatorFeeTokenAccount || !secret) {
    throw new Error('Missing required args');
  }

  const payer = readKeypair(wallet);
  const conn = new web3.Connection('https://api.devnet.solana.com', 'confirmed');
  const pid = new web3.PublicKey(programId);

  const [globalState] = web3.PublicKey.findProgramAddressSync([Buffer.from('global')], pid);
  const [megaVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], pid);
  const [megaChallenge] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_challenge')], pid);
  const [playerProfile] = web3.PublicKey.findProgramAddressSync([Buffer.from('player'), payer.publicKey.toBuffer()], pid);

  const gsInfo = await conn.getAccountInfo(globalState, 'confirmed');
  if (!gsInfo) throw new Error('GlobalState missing');
  const vaultCount = readGlobalVaultCount(gsInfo.data);

  const vaultIdBytes = Buffer.alloc(8);
  vaultIdBytes.writeBigUInt64LE(vaultCount);
  const [vaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), vaultIdBytes], pid);

  const tokenProgram = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const assocTokenProgram = new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const systemProgram = web3.SystemProgram.programId;

  const mintPk = new web3.PublicKey(feeMint);

  const vaultFeeAta = web3.PublicKey.findProgramAddressSync([
    vaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    mintPk.toBuffer(),
  ], assocTokenProgram)[0];

  const vaultPrizeAta = web3.PublicKey.findProgramAddressSync([
    vaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    mintPk.toBuffer(),
  ], assocTokenProgram)[0];

  const megaVaultFeeAta = web3.PublicKey.findProgramAddressSync([
    megaVaultPda.toBuffer(),
    tokenProgram.toBuffer(),
    mintPk.toBuffer(),
  ], assocTokenProgram)[0];

  const endTs = BigInt(Math.floor(Date.now() / 1000) + 86400);
  const secretHash = crypto.createHash('sha256').update(secret).digest();
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

  const createIxData = concat(ixDiscriminator('create_vault'), args);

  const createIx = new web3.TransactionInstruction({
    programId: pid,
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: megaVaultPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: playerProfile, isSigner: false, isWritable: true },
      { pubkey: mintPk, isSigner: false, isWritable: false },
      { pubkey: new web3.PublicKey(creatorFeeTokenAccount), isSigner: false, isWritable: true },
      { pubkey: vaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: vaultPrizeAta, isSigner: false, isWritable: true },
      { pubkey: megaVaultFeeAta, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: assocTokenProgram, isSigner: false, isWritable: false },
      { pubkey: systemProgram, isSigner: false, isWritable: false },
    ],
    data: createIxData,
  });

  const tx = new web3.Transaction().add(createIx);

  if (setMega) {
    const setData = concat(ixDiscriminator('set_mega_challenge_vault'), pkBytes(vaultPda));
    const setIx = new web3.TransactionInstruction({
      programId: pid,
      keys: [
        { pubkey: globalState, isSigner: false, isWritable: true },
        { pubkey: megaChallenge, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: systemProgram, isSigner: false, isWritable: false },
      ],
      data: setData,
    });
    tx.add(setIx);
  }

  tx.feePayer = payer.publicKey;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  console.log('creating vaultPda', vaultPda.toBase58(), 'pinLen', pinLen, 'prize', prize.toString(), 'baseFee', baseFee.toString());

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('confirmed', sig);
  console.log('VAULT', vaultPda.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
