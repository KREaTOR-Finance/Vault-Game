package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun ResultScreen(
    vaultId: String,
    onTryAgain: () -> Unit,
    onClaim: () -> Unit,
    onBackToVault: () -> Unit,
    vm: ResultViewModel = viewModel(factory = ResultViewModel.factory(vaultId)),
) {
    val state by vm.state.collectAsState()

    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Result", style = MaterialTheme.typography.titleLarge)
            Text(state.message, color = MaterialTheme.colorScheme.onSurfaceVariant)

            if (state.success) {
                Button(onClick = onClaim) { Text("Claim now") }
            } else {
                Button(onClick = onTryAgain) { Text("Try again") }
            }

            OutlinedButton(onClick = onBackToVault) { Text("Back to vault") }
        }
    }
}

data class ResultUiState(
    val success: Boolean = false,
    val message: String = "ACCESS DENIED",
)
