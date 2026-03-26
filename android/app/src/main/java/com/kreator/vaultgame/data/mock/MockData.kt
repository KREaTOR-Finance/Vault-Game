package com.kreator.vaultgame.data.mock

import com.kreator.vaultgame.data.model.*
import java.time.Instant
import java.time.temporal.ChronoUnit

object MockData {
    val walletConnected = WalletState(
        connected = true,
        address = "7W1n…k9Qz",
        skrBalance = 12_500,
        solBalance = 3,
    )

    val walletGuest = WalletState(
        connected = false,
        address = null,
        skrBalance = 0,
        solBalance = 0,
    )

    fun vaults(): List<VaultCardModel> {
        val now = Instant.now()
        return listOf(
            VaultCardModel(
                id = "v001",
                title = "NEON SAFEHOUSE",
                mint = MintKind.SKR,
                prize = Amount(MintKind.SKR, 50_000),
                currentFee = Amount(MintKind.SKR, 250),
                attempts = 128,
                endTs = now.plus(6, ChronoUnit.HOURS),
                status = VaultStatus.ACTIVE,
                winnerAddress = null,
                settledAt = null,
                paidOut = false,
            ),
            VaultCardModel(
                id = "v002",
                title = "SIGMA MAINFRAME",
                mint = MintKind.SKR,
                prize = Amount(MintKind.SKR, 2_000),
                currentFee = Amount(MintKind.SKR, 100),
                attempts = 9,
                endTs = now.plus(2, ChronoUnit.DAYS),
                status = VaultStatus.ACTIVE,
                winnerAddress = null,
                settledAt = null,
                paidOut = false,
            ),
            VaultCardModel(
                id = "v003",
                title = "MEGA CHALLENGE",
                mint = MintKind.SKR,
                prize = Amount(MintKind.SKR, 250_000),
                currentFee = Amount(MintKind.SKR, 1_500),
                attempts = 512,
                endTs = now.plus(1, ChronoUnit.DAYS),
                status = VaultStatus.SETTLED,
                winnerAddress = "9aQe…4XwP",
                settledAt = now.minus(3, ChronoUnit.MINUTES),
                paidOut = false,
            ),
        )
    }

    fun vaultDetail(id: String): VaultDetailModel {
        val card = vaults().first { it.id == id }
        val pinLen = if (card.id == "v003") 8 else 4
        val preview = listOf(1, 2, 3, 4, 5).map { step ->
            val v = (card.currentFee.value * (1.2 * step)).toLong().coerceAtLeast(card.currentFee.value)
            Amount(card.mint, v)
        }
        return VaultDetailModel(
            card = card,
            pinLen = pinLen,
            feeLadderPreview = preview,
            rakeBpsMega = 2000,
            rakeBpsWinner = 8000,
            dailyFreeTryAvailable = true,
        )
    }
}
