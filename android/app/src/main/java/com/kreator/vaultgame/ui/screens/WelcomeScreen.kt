package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kreator.vaultgame.ui.LocalActivityResultSender
import com.kreator.vaultgame.ui.components.TxStatusOverlay

@Composable
fun WelcomeScreen(
    onConnectedToMega: (String) -> Unit,
    vm: WelcomeViewModel = viewModel(),
) {
    val sender = LocalActivityResultSender.current
    val state by vm.state.collectAsState()

    LaunchedEffect(Unit) {
        vm.effects.effects.collect { eff ->
            when (eff) {
                is WelcomeEffect.ConnectedToMega -> onConnectedToMega(eff.vaultPubkey)
            }
        }
    }

    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Text("VAULT-GAME", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(10.dp))
            Text("> Welcome to Sigma.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(18.dp))

            Surface(shape = MaterialTheme.shapes.large, tonalElevation = 2.dp) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("How it works", style = MaterialTheme.typography.titleMedium)
                    Text("• Create vaults by depositing SKR (primary) or SOL (fallback).", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("• Attempts feed the Mega Vault (treasury rake) + the winner pool.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("• Crack it → claim immediately.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("• Daily Free Try: 1 per UTC day.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(18.dp))

            Button(
                onClick = {
                    if (sender != null) vm.connectAndLoadMega(sender) else vm.setError("Wallet sender not available")
                },
                enabled = !state.isConnecting,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (state.isConnecting) "Connecting…" else "Connect Wallet")
            }

            Spacer(Modifier.height(10.dp))

            OutlinedButton(
                onClick = { /* Force-connect policy: do nothing */ },
                enabled = false,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Continue as guest (disabled)")
            }

            state.error?.let {
                Spacer(Modifier.height(10.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }

            if (state.isConnecting) {
                Spacer(Modifier.height(14.dp))
                TxStatusOverlay(
                    title = if (state.phase == WelcomePhase.CONNECTING) "Awaiting wallet authorization…" else "Loading Mega Challenge…",
                    body = if (state.phase == WelcomePhase.CONNECTING) "Approve connection in your wallet." else "Fetching the first mission on-chain."
                )
            }
        }
    }
}

enum class WelcomePhase { IDLE, CONNECTING, LOADING_MEGA }

data class WelcomeUiState(
    val phase: WelcomePhase = WelcomePhase.IDLE,
    val error: String? = null,
) {
    val isConnecting: Boolean get() = phase != WelcomePhase.IDLE
}
