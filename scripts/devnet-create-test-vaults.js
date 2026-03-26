/* Create 3 test vaults on devnet (plus optional mega update) with known secret hashes.
 *
 * You provide secret hashes (sha256 of your 8-digit combo) so only you know the combos.
 *
 * Usage:
 *  node scripts/devnet-create-test-vaults.js \
 *    --programId <PROGRAM_ID> \
 *    --wallet <KEYPAIR_JSON> \
 *    --feeMint <DEVNET_SKR_MINT> \
 *    --creatorFeeTokenAccount <TOKEN_ACCOUNT_FOR_FEE_MINT> \
 *    --vault1HashHex <64-hex> --vault1Prize <u64> --vault1BaseFee <u64> \
 *    --vault2HashHex <64-hex> --vault2Prize <u64> --vault2BaseFee <u64> \
 *    --vault3HashHex <64-hex> --vault3Prize <u64> --vault3BaseFee <u64>
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

function readGlobalVaultCount(gsBytes) {
  // disc(8) + authority(32) + skr_mint(32) + vault_count(u64)
  const off = 8 + 32 + 32;
  return Buffer.from(gsBytes).readBigUInt64LE(off);
}

function hex32(hex) {
  const b = Buffer.from(hex, 'hex');
  if (b.length !== 32) throw new Error('secret hash must be 32 bytes (64 hex chars)');
  return b;
}

async function createVault({ conn, programId, payer, feeMint, creatorFeeTokenAccount, pinLen, baseFee, prize, secretHashHex }) {
  const [globalState] = web3.PublicKey.findProgramAddressSync([Buffer.from('global')], programId);
  const [megaVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('mega_vault')], programId);
  const [playerProfile] = web3.PublicKey.findProgramAddressSync([Buffer.from('player'), payer.publicKey.toBuffer()], programId);

  const gsInfo = await conn.getAccountInfo(globalState, 'confirmed');
  if (!gsInfo) throw new Error('GlobalState missing');
  const vaultCount = readGlobalVaultCount(gsInfo.data);

  const vaultIdBytes = Buffer.alloc(8);
  vaultIdBytes.writeBigUInt64LE(vaultCount);

  const [vaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), vaultIdBytes], programId);

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
  const feeMintOptSome = Buffer.from([1]);

  const args = concat(
    i64LE(endTs),
    hex32(secretHashHex),
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
    data: ixData,
  });

  const tx = new web3.Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
  await conn.confirmTransaction(sig, 'confirmed');

  return { vaultPda: vaultPda.toBase58(), sig };
}

async function main() {
  const programId = arg('--programId');
  const wallet = arg('--wallet');
  const feeMint = arg('--feeMint');
  const creatorFeeTokenAccount = arg('--creatorFeeTokenAccount');

  const vaults = [
    { hash: arg('--vault1HashHex'), prize: arg('--vault1Prize'), baseFee: arg('--vault1BaseFee') },
    { hash: arg('--vault2HashHex'), prize: arg('--vault2Prize'), baseFee: arg('--vault2BaseFee') },
    { hash: arg('--vault3HashHex'), prize: arg('--vault3Prize'), baseFee: arg('--vault3BaseFee') },
  ];

  if (!programId || !wallet || !feeMint || !creatorFeeTokenAccount) throw new Error('Missing required args');
  vaults.forEach((v, i) => { if (!v.hash) throw new Error(`Missing vault${i+1}HashHex`); });

  const payer = readKeypair(wallet);
  const conn = new web3.Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('programId', programId);
  console.log('payer', payer.publicKey.toBase58());
  console.log('feeMint', feeMint);

  for (let i = 0; i < vaults.length; i++) {
    const v = vaults[i];
    const res = await createVault({
      conn,
      programId: new web3.PublicKey(programId),
      payer,
      feeMint,
      creatorFeeTokenAccount,
      pinLen: 8,
      baseFee: BigInt(v.baseFee || '0'),
      prize: BigInt(v.prize || '0'),
      secretHashHex: v.hash,
    });
    console.log(`vault${i+1}`, res.vaultPda, 'sig', res.sig);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
