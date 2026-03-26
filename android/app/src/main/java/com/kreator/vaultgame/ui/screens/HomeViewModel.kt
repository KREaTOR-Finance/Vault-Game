package com.kreator.vaultgame.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kreator.vaultgame.data.model.MintKind
import com.kreator.vaultgame.data.model.VaultCardModel
import com.kreator.vaultgame.data.model.WalletState
import com.kreator.vaultgame.data.repo.LiveVaultRepository
import com.kreator.vaultgame.data.repo.MwaWalletRepository
import com.kreator.vaultgame.data.repo.VaultRepository
import com.kreator.vaultgame.data.repo.WalletRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(
    private val walletRepo: WalletRepository = MwaWalletRepository(),
    private val vaultRepo: VaultRepository = LiveVaultRepository(),
) : ViewModel() {

    private val _state = MutableStateFlow(
        HomeUiState(
            wallet = WalletState(false, null, 0, 0),
            filter = HomeFilter.SKR,
            vaults = emptyList(),
        )
    )
    val state: StateFlow<HomeUiState> = _state

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            val wallet = walletRepo.getWalletState()
            val all = vaultRepo.listVaults()
            _state.update { it.copyWalletAndVaults(wallet, applyFilter(all, it.filter)) }
        }
    }

    fun setFilter(filter: HomeFilter) {
        _state.update { it.copy(filter = filter) }
        refresh()
    }

    fun connect(sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender) {
        viewModelScope.launch {
            val wallet = walletRepo.connect(sender)
            val all = vaultRepo.listVaults()
            _state.update { it.copyWalletAndVaults(wallet, applyFilter(all, it.filter)) }
        }
    }

    fun disconnect() {
        viewModelScope.launch {
            val wallet = walletRepo.disconnect()
            val all = vaultRepo.listVaults()
            _state.update { it.copyWalletAndVaults(wallet, applyFilter(all, it.filter)) }
        }
    }

    private fun applyFilter(all: List<VaultCardModel>, filter: HomeFilter): List<VaultCardModel> {
        return when (filter) {
            HomeFilter.SKR -> all.filter { it.mint == MintKind.SKR }
            HomeFilter.ALL -> all
        }
    }
}

private fun HomeUiState.copyWalletAndVaults(wallet: WalletState, vaults: List<VaultCardModel>): HomeUiState {
    return HomeUiState(wallet = wallet, filter = this.filter, vaults = vaults)
}
