package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.repo.LiveVaultRepository
import com.kreator.vaultgame.data.repo.VaultRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ClaimViewModel(
    private val vaultId: String,
    private val vaultRepo: VaultRepository = LiveVaultRepository(),
) : ViewModel() {

    private val _state = MutableStateFlow(ClaimUiState())
    val state: StateFlow<ClaimUiState> = _state

    fun claim(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isClaiming = true, error = null) }
            try {
                val ok = vaultRepo.claimPrize(sender, vaultId)
                _state.update { it.copy(isClaiming = false, error = if (ok) null else "Claim failed") }
                if (ok) onDone()
            } catch (e: Exception) {
                _state.update { it.copy(isClaiming = false, error = e.message ?: "Claim failed") }
            }
        }
    }

    companion object {
        fun factory(vaultId: String): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return ClaimViewModel(vaultId) as T
            }
        }
    }
}
