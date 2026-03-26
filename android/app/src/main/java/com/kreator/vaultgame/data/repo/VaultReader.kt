package com.kreator.vaultgame.data.repo

import com.funkatronics.encoders.Base58
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Minimal Anchor account decoder for Vault (programs/vault_game/src/lib.rs).
 * Layout (borsh) = discriminator(8) + fields in order.
 */
object VaultReader {

    data class DecodedVault(
        val creator: String,
        val isSystem: Boolean,
        val status: Int,
        val createdAt: Long,
        val endTs: Long,
        val pinLen: Int,
        val vaultId: Long,
        val isSol: Boolean,
        val mint: String,
        val prizeAmount: Long,
        val baseFee: Long,
        val feeStep: Long,
        val currentFee: Long,
        val attemptCount: Long,
        val winner: String?,
        val settledAt: Long?,
        val paidOut: Boolean,
    )

    fun decode(accountData: ByteArray): DecodedVault {
        val bb = ByteBuffer.wrap(accountData).order(ByteOrder.LITTLE_ENDIAN)
        bb.position(8) // skip discriminator

        fun readPubkey(): String {
            val b = ByteArray(32)
            bb.get(b)
            return Base58.encodeToString(b)
        }

        fun readI64(): Long = bb.long
        fun readU64(): Long = bb.long // values fit in signed for our UI needs
        fun readU8(): Int = (bb.get().toInt() and 0xFF)
        fun readBool(): Boolean = bb.get().toInt() != 0

        val creator = readPubkey()
        val isSystem = readBool()
        val status = readU8()
        val createdAt = readI64()
        val endTs = readI64()
        val pinLen = readU8()

        val vaultId = readU64()

        val isSol = readBool()
        val mint = readPubkey()

        val prizeAmount = readU64()
        val baseFee = readU64()
        val feeStep = readU64()
        val currentFee = readU64()
        val attemptCount = readU64()

        val winnerTag = readU8()
        val winner = if (winnerTag == 1) readPubkey() else null

        val settledTag = readU8()
        val settledAt = if (settledTag == 1) readI64() else null

        val paidOut = readBool()
        // bump u8 (skip)

        return DecodedVault(
            creator = creator,
            isSystem = isSystem,
            status = status,
            createdAt = createdAt,
            endTs = endTs,
            pinLen = pinLen,
            vaultId = vaultId,
            isSol = isSol,
            mint = mint,
            prizeAmount = prizeAmount,
            baseFee = baseFee,
            feeStep = feeStep,
            currentFee = currentFee,
            attemptCount = attemptCount,
            winner = winner,
            settledAt = settledAt,
            paidOut = paidOut,
        )
    }
}
