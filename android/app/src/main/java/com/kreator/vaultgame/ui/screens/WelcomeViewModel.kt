package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.repo.MwaWalletRepository
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface WelcomeEffect {
    data class ConnectedToMega(val vaultPubkey: String) : WelcomeEffect
}

class WelcomeViewModel(
    private val walletRepo: MwaWalletRepository = MwaWalletRepository(),
    private val rpc: com.kreator.vaultgame.data.repo.SolanaRpc = com.kreator.vaultgame.data.repo.SolanaRpc(),
) : ViewModel() {

    private val _state = MutableStateFlow(WelcomeUiState())
    val state: StateFlow<WelcomeUiState> = _state

    val effects = UiEffectBus<WelcomeEffect>()

    fun connectAndLoadMega(sender: ActivityResultSender) {
        viewModelScope.launch {
            _state.update { it.copy(phase = WelcomePhase.CONNECTING, error = null) }
            val wallet = walletRepo.connect(sender)
            if (!wallet.connected) {
                _state.update { it.copy(phase = WelcomePhase.IDLE, error = "Wallet connection failed. Make sure a MWA wallet is installed.") }
                return@launch
            }

            _state.update { it.copy(phase = WelcomePhase.LOADING_MEGA) }

            val pda = com.kreator.vaultgame.data.repo.SolanaAddresses.megaChallengePda().base58()
            val data = rpc.getAccountInfoBase64(pda)
            val megaVault = data?.let { com.kreator.vaultgame.data.repo.MegaChallengeReader.parseVaultPubkey(it) }

            if (megaVault.isNullOrBlank()) {
                _state.update { it.copy(phase = WelcomePhase.IDLE, error = "Mega Challenge vault not set. Ask admin to run set_mega_challenge_vault.") }
                return@launch
            }

            _state.update { it.copy(phase = WelcomePhase.IDLE) }
            effects.emit(WelcomeEffect.ConnectedToMega(megaVault))
        }
    }

    fun setError(msg: String) {
        _state.update { it.copy(error = msg) }
    }
}
