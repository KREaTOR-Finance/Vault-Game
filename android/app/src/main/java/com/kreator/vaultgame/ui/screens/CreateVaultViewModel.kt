package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.model.MintKind
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CreateVaultViewModel : ViewModel() {
    private val _state = MutableStateFlow(CreateVaultUiState())
    val state: StateFlow<CreateVaultUiState> = _state

    fun next() { _state.update { it.copy(step = (it.step + 1).coerceAtMost(4)) } }
    fun prev() { _state.update { it.copy(step = (it.step - 1).coerceAtLeast(1)) } }

    fun setMint(m: MintKind) { _state.update { it.copy(mint = m) } }
    fun setPrize(text: String) { _state.update { it.copy(prizeText = text) } }
    fun setSecret(text: String) { _state.update { it.copy(secret = text) } }
    fun setPinLen(n: Int) { _state.update { it.copy(pinLen = n) } }

    fun deploy(onDone: () -> Unit) {
        viewModelScope.launch {
            // In real implementation, we check SKR balance and show swap gate if needed.
            if (_state.value.mint == MintKind.SKR && _state.value.prizeText.toLongOrNull()?.let { it > 1_000_000 } == true) {
                _state.update { it.copy(showSwapGate = true) }
                return@launch
            }
            _state.update { it.copy(isDeploying = true) }
            kotlinx.coroutines.delay(900)
            _state.update { it.copy(isDeploying = false) }
            onDone()
        }
    }

    fun swapForSkr() {
        // Placeholder: later we deep link to Jupiter or wallet swap.
        _state.update { it.copy(showSwapGate = false) }
    }

    fun dismissSwap() {
        _state.update { it.copy(showSwapGate = false) }
    }
}
