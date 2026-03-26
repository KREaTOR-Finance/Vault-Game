package com.kreator.vaultgame

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Very small app-wide store for pending deep links.
 *
 * Alpha rule: deep links force-connect, then route.
 * If a deep link is present, we still send the user to Mega first (tutorial),
 * and then offer a one-tap jump to the linked vault.
 */
object AppLinks {
    private val _pendingVault = MutableStateFlow<String?>(null)
    val pendingVault: StateFlow<String?> = _pendingVault

    fun setPendingVault(vaultPubkey: String?) {
        _pendingVault.value = vaultPubkey
    }

    fun consumePendingVault(): String? {
        val v = _pendingVault.value
        _pendingVault.value = null
        return v
    }
}
