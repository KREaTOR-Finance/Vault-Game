@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun MegaScreen(
    onOpenVault: (String) -> Unit,
    vm: MegaViewModel = viewModel(),
) {
    val state by vm.state.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Mega Vault") }) }) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Treasury feeds the Mega Vault.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Surface(tonalElevation = 2.dp, shape = MaterialTheme.shapes.large) {
                Column(Modifier.padding(12.dp)) {
                    Text("Mega pot: ${state.megaPot}")
                    Text("Challenge vault: ${state.megaChallengeVaultId ?: "—"}")
                }
            }
            Button(onClick = { state.megaChallengeVaultId?.let(onOpenVault) }, enabled = state.megaChallengeVaultId != null) {
                Text("Open Mega Challenge")
            }
        }
    }
}

data class MegaUiState(
    val megaPot: String = "(mock) 123000 SKR",
    val megaChallengeVaultId: String? = "v003",
)
