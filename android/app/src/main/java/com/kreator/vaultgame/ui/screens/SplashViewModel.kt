package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.repo.MegaChallengeReader
import com.kreator.vaultgame.data.repo.SolanaAddresses
import com.kreator.vaultgame.data.repo.SolanaRpc
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface SplashEffect {
    data class NavigateToVault(val vaultPubkey: String) : SplashEffect
    data object NavigateHome : SplashEffect
}

data class SplashUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
)

class SplashViewModel(
    private val rpc: SolanaRpc = SolanaRpc(),
) : ViewModel() {

    private val _state = MutableStateFlow(SplashUiState())
    val state: StateFlow<SplashUiState> = _state

    val effects = UiEffectBus<SplashEffect>()

    init {
        bootstrap()
    }

    private fun bootstrap() {
        viewModelScope.launch {
            try {
                val pda = SolanaAddresses.megaChallengePda().base58()
                val data = rpc.getAccountInfoBase64(pda)
                val vault = data?.let { MegaChallengeReader.parseVaultPubkey(it) }

                _state.update { it.copy(isLoading = false) }

                if (!vault.isNullOrBlank()) {
                    effects.emit(SplashEffect.NavigateToVault(vault))
                } else {
                    effects.emit(SplashEffect.NavigateHome)
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Failed to load") }
                effects.emit(SplashEffect.NavigateHome)
            }
        }
    }
}
