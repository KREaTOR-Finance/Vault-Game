package com.kreator.vaultgame.data.repo

import com.funkatronics.encoders.Base58
import com.solana.publickey.SolanaPublicKey

/**
 * Reads MegaChallenge PDA and extracts the target vault pubkey.
 *
 * Anchor layout assumption (matches programs/vault_game/src/lib.rs):
 * discriminator(8) + authority(32) + vault(32) + bump(1)
 */
object MegaChallengeReader {
    fun parseVaultPubkey(accountData: ByteArray): String? {
        if (accountData.size < 8 + 32 + 32) return null
        val offset = 8 + 32
        val vaultBytes = accountData.copyOfRange(offset, offset + 32)
        return Base58.encodeToString(vaultBytes)
    }
}
