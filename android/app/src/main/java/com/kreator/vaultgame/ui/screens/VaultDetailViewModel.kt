package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.repo.MockNameRepository
// MockVaultRepository removed (live-only v1 rails)
import com.kreator.vaultgame.data.repo.NameRepository
import com.kreator.vaultgame.data.repo.VaultRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class VaultDetailViewModel(
    private val vaultId: String,
    private val vaultRepo: VaultRepository = com.kreator.vaultgame.data.repo.LiveVaultRepository(),
    private val nameRepo: NameRepository = MockNameRepository(),
) : ViewModel() {

    private val _state = MutableStateFlow(VaultDetailUiState())
    val state: StateFlow<VaultDetailUiState> = _state

    init {
        refresh()
    }

    private fun refresh() {
        viewModelScope.launch {
            // TODO: replace with real on-chain vault decoding.
            val detail = vaultRepo.getVaultDetail(vaultId)
            _state.update { it.copy(detail = detail) }

            val addr = detail.card.winnerAddress
            if (addr != null) {
                val name = nameRepo.reverseResolveSkrName(addr)
                _state.update { it.copy(winnerName = name) }
            }
        }
    }

    companion object {
        fun factory(vaultId: String): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return VaultDetailViewModel(vaultId) as T
            }
        }
    }
}
