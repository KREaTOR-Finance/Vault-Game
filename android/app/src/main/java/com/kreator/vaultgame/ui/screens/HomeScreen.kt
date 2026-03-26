package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kreator.vaultgame.data.model.MintKind
import com.kreator.vaultgame.ui.LocalActivityResultSender
import com.kreator.vaultgame.ui.components.MintPill
import com.kreator.vaultgame.ui.components.WalletStatusBar
import com.kreator.vaultgame.ui.components.WinnerBadge

@Composable
fun HomeScreen(
    onOpenVault: (String) -> Unit,
    onCreateVault: () -> Unit,
    onProfile: () -> Unit,
    onMega: () -> Unit,
    onLogs: () -> Unit,
    onHelp: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val state by vm.state.collectAsState()

    val sender = LocalActivityResultSender.current

    Column(Modifier.fillMaxSize()) {
        WalletStatusBar(
            wallet = state.wallet,
            onConnect = { if (sender != null) vm.connect(sender) },
            onDisconnect = vm::disconnect
        )

        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = state.filter == HomeFilter.SKR,
                onClick = { vm.setFilter(HomeFilter.SKR) },
                label = { Text("SKR") }
            )
            // v1 rails are SPL-only (SKR); SOL filter removed.
            FilterChip(
                selected = state.filter == HomeFilter.ALL,
                onClick = { vm.setFilter(HomeFilter.ALL) },
                label = { Text("All") }
            )
            Spacer(Modifier.weight(1f))
            OutlinedButton(onClick = onMega) { Text("Mega") }
            OutlinedButton(onClick = onProfile) { Text("Profile") }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(state.vaults) { v ->
                Surface(
                    shape = MaterialTheme.shapes.large,
                    tonalElevation = 2.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenVault(v.id) }
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(v.title, style = MaterialTheme.typography.titleMedium)
                            MintPill(v.mint)
                        }
                        Spacer(Modifier.height(6.dp))
                        Text("Prize: ${v.prize.pretty()}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Fee: ${v.currentFee.pretty()} • Attempts: ${v.attempts}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        WinnerBadge(
                            crackedBy = v.winnerAddress,
                            crackedName = null,
                            paidOut = v.paidOut,
                        )
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(onClick = onCreateVault, modifier = Modifier.weight(1f)) { Text("Create Vault") }
            OutlinedButton(onClick = onLogs) { Text("Logs") }
            OutlinedButton(onClick = onHelp) { Text("Help") }
        }
    }
}

enum class HomeFilter { SKR, ALL }

data class HomeUiState(
    val wallet: com.kreator.vaultgame.data.model.WalletState,
    val filter: HomeFilter,
    val vaults: List<com.kreator.vaultgame.data.model.VaultCardModel>,
)
