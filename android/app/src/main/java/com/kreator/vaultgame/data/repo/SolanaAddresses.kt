package com.kreator.vaultgame.data.repo

import com.kreator.vaultgame.BuildConfig
import com.solana.publickey.SolanaPublicKey
import com.solana.publickey.ProgramDerivedAddress

object SolanaAddresses {
    val programId: SolanaPublicKey = SolanaPublicKey.from(BuildConfig.PROGRAM_ID)

    val tokenProgramId: SolanaPublicKey = SolanaPublicKey.from("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    val associatedTokenProgramId: SolanaPublicKey = SolanaPublicKey.from("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    val systemProgramId: SolanaPublicKey = SolanaPublicKey.from("11111111111111111111111111111111")
    val rentSysvarId: SolanaPublicKey = SolanaPublicKey.from("SysvarRent111111111111111111111111111111111")

    /** PDA: seeds = ["mega_challenge"] */
    suspend fun megaChallengePda(): SolanaPublicKey {
        val seed = "mega_challenge".toByteArray(Charsets.UTF_8)
        return ProgramDerivedAddress.find(listOf(seed), programId).getOrThrow()
    }

    /** PDA: seeds = ["mega_vault"] */
    suspend fun megaVaultPda(): SolanaPublicKey {
        val seed = "mega_vault".toByteArray(Charsets.UTF_8)
        return ProgramDerivedAddress.find(listOf(seed), programId).getOrThrow()
    }

    /**
     * Associated token account (ATA):
     * seeds = [owner, token_program_id, mint] with associated token program.
     */
    suspend fun associatedTokenAddress(owner: SolanaPublicKey, mint: SolanaPublicKey): SolanaPublicKey {
        return ProgramDerivedAddress.find(
            listOf(owner.bytes, tokenProgramId.bytes, mint.bytes),
            associatedTokenProgramId
        ).getOrThrow()
    }
}
