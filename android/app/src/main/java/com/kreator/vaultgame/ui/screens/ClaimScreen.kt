@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kreator.vaultgame.ui.components.TxStatusOverlay

@Composable
fun ClaimScreen(
    vaultId: String,
    onDone: () -> Unit,
    onBack: () -> Unit,
    vm: ClaimViewModel = viewModel(factory = ClaimViewModel.factory(vaultId)),
) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Claim") },
                navigationIcon = { IconButton(onClick = onBack) { Text("<") } }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Immediate claim on win.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            val sender = com.kreator.vaultgame.ui.LocalActivityResultSender.current
            Button(
                onClick = {
                    val s = sender ?: return@Button
                    vm.claim(s) { onDone() }
                },
                enabled = !state.isClaiming && sender != null,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Claim prize") }

            if (state.isClaiming) {
                TxStatusOverlay(title = "Releasing escrow…", body = "Confirming on-chain…")
            }

            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}

data class ClaimUiState(
    val isClaiming: Boolean = false,
    val error: String? = null,
)
