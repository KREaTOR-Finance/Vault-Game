// Minimal decoder for VaultCrack v1 Vault account.
// Matches programs/vault_game/src/lib.rs struct Vault.

import { PublicKey } from '@solana/web3.js';

function readPubkey(buf, off) {
  return new PublicKey(buf.subarray(off, off + 32)).toBase58();
}

export function decodeVaultAccount(data) {
  // Anchor discriminator (8)
  let o = 8;

  const creator = readPubkey(data, o); o += 32;
  const isSystem = data.readUInt8(o) !== 0; o += 1;
  const status = data.readUInt8(o); o += 1;
  const createdAt = Number(data.readBigInt64LE(o)); o += 8;
  const endTs = Number(data.readBigInt64LE(o)); o += 8;
  const pinLen = data.readUInt8(o); o += 1;

  const vaultId = data.readBigUInt64LE(o).toString(); o += 8;

  const isSol = data.readUInt8(o) !== 0; o += 1;
  const mint = readPubkey(data, o); o += 32;

  const prizeAmount = data.readBigUInt64LE(o).toString(); o += 8;
  const baseFee = data.readBigUInt64LE(o).toString(); o += 8;
  const feeStep = data.readBigUInt64LE(o).toString(); o += 8;
  const currentFee = data.readBigUInt64LE(o).toString(); o += 8;
  const attemptCount = data.readBigUInt64LE(o).toString(); o += 8;

  const winnerTag = data.readUInt8(o); o += 1;
  const winnerPubkey = winnerTag === 1 ? readPubkey(data, o) : null;
  if (winnerTag === 1) o += 32;

  const settledTag = data.readUInt8(o); o += 1;
  const settledAt = settledTag === 1 ? Number(data.readBigInt64LE(o)) : null;
  if (settledTag === 1) o += 8;

  const paidOut = data.readUInt8(o) !== 0; o += 1;
  const bump = data.readUInt8(o); o += 1;

  return {
    creator_pubkey: creator,
    is_system: isSystem,
    status,
    created_at_unix: createdAt,
    end_ts_unix: endTs,
    pin_len: pinLen,
    vault_id: vaultId,
    is_sol: isSol,
    mint,
    prize_amount: prizeAmount,
    base_fee: baseFee,
    fee_step: feeStep,
    current_fee: currentFee,
    attempt_count: attemptCount,
    winner_pubkey: winnerPubkey,
    settled_at_unix: settledAt,
    paid_out: paidOut,
    bump,
  };
}
