package com.kreator.vaultgame.ui.nav

sealed class Route(val path: String) {
    data object Splash : Route("splash")
    data object Welcome : Route("welcome")
    data object Home : Route("home")

    data object CreateVault : Route("create")
    data object Mega : Route("mega")
    data object Rewards : Route("rewards")
    data object Profile : Route("profile")
    data object Logs : Route("logs")
    data object Help : Route("help")

    data object VaultDetail : Route("vault/{vaultId}") {
        fun build(vaultId: String) = "vault/$vaultId"
    }

    data object Crack : Route("vault/{vaultId}/crack") {
        fun build(vaultId: String) = "vault/$vaultId/crack"
    }

    data object Result : Route("vault/{vaultId}/result") {
        fun build(vaultId: String) = "vault/$vaultId/result"
    }

    data object Claim : Route("vault/{vaultId}/claim") {
        fun build(vaultId: String) = "vault/$vaultId/claim"
    }
}

const val ARG_VAULT_ID = "vaultId"
