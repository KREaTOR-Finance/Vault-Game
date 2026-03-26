package com.kreator.vaultgame.data.repo

import com.solana.publickey.SolanaPublicKey
import com.solana.transaction.AccountMeta
import com.solana.transaction.TransactionInstruction
import java.security.MessageDigest

/**
 * Minimal instruction builders for the VaultCrack program.
 *
 * We build Anchor-style instruction discriminators: first 8 bytes of sha256("global:<ix_name>").
 *
 * Debugging tips:
 * - If you hit `InstructionDidNotDeserialize`, your discriminator or account ordering is wrong.
 * - Use Solana Explorer + program logs to see which instruction the program thinks it received.
 */
object VaultGameIxs {

    private fun ixDiscriminator(ixName: String): ByteArray {
        val preimage = "global:$ixName".toByteArray(Charsets.UTF_8)
        val hash = MessageDigest.getInstance("SHA-256").digest(preimage)
        return hash.copyOfRange(0, 8)
    }

    suspend fun attemptSpl(
        programId: SolanaPublicKey,
        vault: SolanaPublicKey,
        megaVault: SolanaPublicKey,
        feeMint: SolanaPublicKey,
        player: SolanaPublicKey,
    ): TransactionInstruction {
        val playerFeeAta = SolanaAddresses.associatedTokenAddress(player, feeMint)
        val megaVaultFeeAta = SolanaAddresses.associatedTokenAddress(megaVault, feeMint)
        val vaultFeeAta = SolanaAddresses.associatedTokenAddress(vault, feeMint)

        // Accounts must match AttemptSpl<'info> in programs/vault_game/src/lib.rs
        return TransactionInstruction(
            programId = programId,
            accounts = listOf(
                AccountMeta(vault, isSigner = false, isWritable = true),
                AccountMeta(megaVault, isSigner = false, isWritable = true),
                AccountMeta(feeMint, isSigner = false, isWritable = false),
                AccountMeta(playerFeeAta, isSigner = false, isWritable = true),
                AccountMeta(megaVaultFeeAta, isSigner = false, isWritable = true),
                AccountMeta(vaultFeeAta, isSigner = false, isWritable = true),
                AccountMeta(player, isSigner = true, isWritable = true),
                AccountMeta(SolanaAddresses.tokenProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.associatedTokenProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.systemProgramId, isSigner = false, isWritable = false),
            ),
            data = ixDiscriminator("attempt_spl")
        )
    }

    suspend fun claimSpl(
        programId: SolanaPublicKey,
        vault: SolanaPublicKey,
        feeMint: SolanaPublicKey,
        winner: SolanaPublicKey,
    ): TransactionInstruction {
        val vaultFeeAta = SolanaAddresses.associatedTokenAddress(vault, feeMint)
        val vaultPrizeAta = SolanaAddresses.associatedTokenAddress(vault, feeMint)
        val winnerFeeAta = SolanaAddresses.associatedTokenAddress(winner, feeMint)

        // Accounts must match ClaimSpl<'info> in programs/vault_game/src/lib.rs
        return TransactionInstruction(
            programId = programId,
            accounts = listOf(
                AccountMeta(vault, isSigner = false, isWritable = true),
                AccountMeta(feeMint, isSigner = false, isWritable = false),
                AccountMeta(vaultFeeAta, isSigner = false, isWritable = true),
                AccountMeta(vaultPrizeAta, isSigner = false, isWritable = true),
                AccountMeta(winnerFeeAta, isSigner = false, isWritable = true),
                AccountMeta(winner, isSigner = true, isWritable = true),
                AccountMeta(SolanaAddresses.tokenProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.associatedTokenProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.systemProgramId, isSigner = false, isWritable = false),
            ),
            data = ixDiscriminator("claim_spl")
        )
    }

    /** Create an associated token account for [owner]. Payer funds the account creation. */
    suspend fun createAta(
        payer: SolanaPublicKey,
        owner: SolanaPublicKey,
        mint: SolanaPublicKey,
    ): TransactionInstruction {
        val ata = SolanaAddresses.associatedTokenAddress(owner, mint)

        // Standard ATA create instruction: empty data.
        return TransactionInstruction(
            programId = SolanaAddresses.associatedTokenProgramId,
            accounts = listOf(
                AccountMeta(payer, isSigner = true, isWritable = true),
                AccountMeta(ata, isSigner = false, isWritable = true),
                AccountMeta(owner, isSigner = false, isWritable = false),
                AccountMeta(mint, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.systemProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.tokenProgramId, isSigner = false, isWritable = false),
                AccountMeta(SolanaAddresses.rentSysvarId, isSigner = false, isWritable = false),
            ),
            data = ByteArray(0)
        )
    }
}
