@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kreator.vaultgame.ui.components.MintPill
import com.kreator.vaultgame.ui.components.WinnerBadge

@Composable
fun VaultDetailScreen(
    vaultId: String,
    onCrack: () -> Unit,
    onClaim: () -> Unit,
    onBack: () -> Unit,
    vm: VaultDetailViewModel = viewModel(factory = VaultDetailViewModel.factory(vaultId)),
) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vault $vaultId") },
                navigationIcon = { IconButton(onClick = onBack) { Text("<") } },
            )
        }
    ) { padding ->
        val detail = state.detail
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (detail == null) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                return@Column
            }

            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    Text(detail.card.title, style = MaterialTheme.typography.titleLarge)
                    Text("Status: ${detail.card.status}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                MintPill(detail.card.mint)
            }

            WinnerBadge(
                crackedBy = detail.card.winnerAddress,
                crackedName = state.winnerName,
                paidOut = detail.card.paidOut,
            )

            Surface(shape = MaterialTheme.shapes.large, tonalElevation = 2.dp) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Prize: ${detail.card.prize.pretty()}")
                    val next = detail.feeLadderPreview.getOrNull(1)?.pretty() ?: "—"
                    Text(
                        "Global fee: ${detail.card.currentFee.pretty()} (next: $next)",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text("PIN length: ${detail.pinLen}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "Rake: ${(detail.rakeBpsWinner/100.0)}% to winner pool, ${(detail.rakeBpsMega/100.0)}% to Mega Vault",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Surface(shape = MaterialTheme.shapes.large, tonalElevation = 2.dp) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tutorial", style = MaterialTheme.typography.titleMedium)
                    Text("You get 1 Daily Free Try per UTC day. Use it to learn the flow.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { /* TODO: wire use_daily_free_try */ }, modifier = Modifier.fillMaxWidth()) {
                        Text("Daily Free Try (Tutorial)")
                    }

                    val pending = com.kreator.vaultgame.AppLinks.pendingVault.collectAsState().value
                    if (pending != null && pending != vaultId) {
                        OutlinedButton(
                            onClick = { onBack(); /* caller should navigate via deep link flow; v0 simple */ },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Continue to shared vault")
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = onCrack, modifier = Modifier.weight(1f)) { Text("Start Crack") }
                OutlinedButton(onClick = onClaim) { Text("Claim") }
            }
        }
    }
}

data class VaultDetailUiState(
    val detail: com.kreator.vaultgame.data.model.VaultDetailModel? = null,
    val winnerName: String? = null,
)
