package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
// MockVaultRepository removed (live-only v1 rails)
import com.kreator.vaultgame.data.repo.VaultRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CrackViewModel(
    private val vaultId: String,
    private val vaultRepo: VaultRepository = com.kreator.vaultgame.data.repo.LiveVaultRepository(),
) : ViewModel() {

    private val _state = MutableStateFlow(CrackUiState(targetLen = 4, feeText = "Loading…", nextFeeText = "Loading…"))
    val state: StateFlow<CrackUiState> = _state

    fun setGuess(text: String) {
        // Enforce numeric-only for PIN vaults.
        val cleaned = text.filter { it.isDigit() }
        _state.update { it.copy(guess = cleaned, error = null) }
    }

    init {
        // Alpha: load vault detail to determine pin length + live cost.
        viewModelScope.launch {
            try {
                val detail = vaultRepo.getVaultDetail(vaultId)
                val pinLen = detail.pinLen
                _state.update { it.copy(targetLen = pinLen) }

                // Display whole-unit rounded cost for alpha; exact minor units on receipt later.
                val currentMinor = detail.card.currentFee.value
                val nextMinor = detail.feeLadderPreview.getOrNull(1)?.value ?: (currentMinor)

                val currentWhole = com.kreator.vaultgame.ui.components.AmountFormat.wholeFromMinor(currentMinor, decimals = 6)
                val nextWhole = com.kreator.vaultgame.ui.components.AmountFormat.wholeFromMinor(nextMinor, decimals = 6)

                _state.update { it.copy(feeText = "$currentWhole SKR", nextFeeText = "$nextWhole SKR") }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message ?: "Failed to load vault", feeText = "—", nextFeeText = "—") }
            }
        }
    }

    fun submitPaidAttempt(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            try {
                val res = vaultRepo.submitPaidAttempt(sender, vaultId, _state.value.guess)
                _state.update { it.copy(isSubmitting = false) }
                if (res.success) {
                    onDone()
                } else {
                    _state.update { it.copy(error = res.message) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSubmitting = false, error = e.message ?: "Attempt failed") }
            }
        }
    }

    fun submitFreeTry(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            try {
                val res = vaultRepo.submitFreeTry(sender, vaultId, _state.value.guess)
                _state.update { it.copy(isSubmitting = false) }
                if (res.success) {
                    onDone()
                } else {
                    _state.update { it.copy(error = res.message) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSubmitting = false, error = e.message ?: "Attempt failed") }
            }
        }
    }

    companion object {
        fun factory(vaultId: String): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return CrackViewModel(vaultId) as T
            }
        }
    }
}
