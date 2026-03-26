package com.kreator.vaultgame.data.model

import java.time.Instant

enum class MintKind { SKR }

data class Amount(
    val mint: MintKind,
    val value: Long,
) {
    fun pretty(): String {
        val symbol = when (mint) {
            MintKind.SKR -> "SKR"
        }
        return "$value $symbol"
    }
}

enum class VaultStatus { ACTIVE, SETTLED, EXPIRED, PAID_OUT, CANCELLED }

data class VaultCardModel(
    val id: String,
    val title: String,
    val mint: MintKind,
    val prize: Amount,
    val currentFee: Amount,
    val attempts: Int,
    val endTs: Instant,
    val status: VaultStatus,
    val winnerAddress: String?,
    val settledAt: Instant?,
    val paidOut: Boolean,
)

data class VaultDetailModel(
    val card: VaultCardModel,
    val pinLen: Int,
    val feeLadderPreview: List<Amount>,
    val rakeBpsMega: Int,
    val rakeBpsWinner: Int,
    val dailyFreeTryAvailable: Boolean,
)

data class FeeSplitModel(
    val toWinnerPool: Amount,
    val toMegaVault: Amount,
)

data class PayoutPreviewModel(
    val winnerPayout: Amount,
    val includesRewards: Boolean,
)

data class WalletState(
    val connected: Boolean,
    val address: String?,
    val skrBalance: Long,
    val solBalance: Long,
    // For alpha debugging on Solana Mobile: surface MWA connection errors without requiring Logcat.
    val error: String? = null,
)

data class SwapRequirement(
    val mint: MintKind,
    val required: Long,
    val current: Long,
)

data class AttemptResultModel(
    val success: Boolean,
    val message: String,
    val signature: String? = null,
)
