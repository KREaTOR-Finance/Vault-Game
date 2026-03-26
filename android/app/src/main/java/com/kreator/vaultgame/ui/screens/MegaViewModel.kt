package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MegaViewModel(
    private val rpc: com.kreator.vaultgame.data.repo.SolanaRpc = com.kreator.vaultgame.data.repo.SolanaRpc(),
) : ViewModel() {
    private val _state = MutableStateFlow(MegaUiState(megaPot = "Loading…", megaChallengeVaultId = null))
    val state: StateFlow<MegaUiState> = _state

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            try {
                val pda = com.kreator.vaultgame.data.repo.SolanaAddresses.megaChallengePda().base58()
                val data = rpc.getAccountInfoBase64(pda)
                val vault = data?.let { com.kreator.vaultgame.data.repo.MegaChallengeReader.parseVaultPubkey(it) }

                val mint = com.solana.publickey.SolanaPublicKey.from(com.kreator.vaultgame.BuildConfig.SKR_MINT)
                val megaVault = com.kreator.vaultgame.data.repo.SolanaAddresses.megaVaultPda()
                val megaFeeAta = com.kreator.vaultgame.data.repo.SolanaAddresses.associatedTokenAddress(megaVault, mint)
                val potUi = rpc.getTokenAccountBalanceUiAmount(megaFeeAta.base58())

                _state.value = _state.value.copy(
                    megaPot = "${potUi.toLong()} SKR",
                    megaChallengeVaultId = vault,
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(megaPot = "Error", megaChallengeVaultId = null)
            }
        }
    }
}
