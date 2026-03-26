@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kreator.vaultgame.data.model.MintKind
import com.kreator.vaultgame.ui.components.SwapGateSheet
import com.kreator.vaultgame.ui.components.TxStatusOverlay

@Composable
fun CreateVaultScreen(
    onDone: () -> Unit,
    vm: CreateVaultViewModel = viewModel(),
) {
    val state by vm.state.collectAsState()

    if (state.showSwapGate) {
        SwapGateSheet(
            requiredText = "You need more SKR to create this vault.",
            onSwap = vm::swapForSkr,
            onDismiss = vm::dismissSwap,
        )
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Create Vault") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StepperHeader(step = state.step)

            when (state.step) {
                1 -> StepMintAndPrize(state, onMint = vm::setMint, onPrize = vm::setPrize)
                2 -> StepSecret(state, onSecret = vm::setSecret)
                3 -> StepRules(state, onPinLen = vm::setPinLen)
                4 -> StepReview(state)
            }

            if (state.isDeploying) {
                TxStatusOverlay(title = "Deploying vault…", body = "Awaiting wallet authorization…")
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = vm::prev, enabled = state.step > 1) { Text("Back") }
                Spacer(Modifier.weight(1f))
                if (state.step < 4) {
                    Button(onClick = vm::next) { Text("Next") }
                } else {
                    Button(onClick = { vm.deploy(onDone) }, enabled = !state.isDeploying) { Text("Deploy") }
                }
            }
        }
    }
}

@Composable
private fun StepperHeader(step: Int) {
    Text("Step $step / 4", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun StepMintAndPrize(state: CreateVaultUiState, onMint: (MintKind) -> Unit, onPrize: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Currency", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = true, onClick = { onMint(MintKind.SKR) }, label = { Text("SKR") })
        }
        OutlinedTextField(value = state.prizeText, onValueChange = onPrize, label = { Text("Prize amount") }, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun StepSecret(state: CreateVaultUiState, onSecret: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Secret", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(value = state.secret, onValueChange = onSecret, label = { Text("Enter secret") }, modifier = Modifier.fillMaxWidth())
        Text("We hash locally and commit on-chain.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StepRules(state: CreateVaultUiState, onPinLen: (Int) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Rules", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(3,4,5,6,8).forEach { n ->
                FilterChip(selected = state.pinLen == n, onClick = { onPinLen(n) }, label = { Text("$n") })
            }
        }
        Text("Fee ladder preview will appear here.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StepReview(state: CreateVaultUiState) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Review", style = MaterialTheme.typography.titleMedium)
        Text("Prize: ${state.prizeText} ${state.mint}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("PIN length: ${state.pinLen}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Treasury rake feeds Mega Vault.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

data class CreateVaultUiState(
    val step: Int = 1,
    val mint: MintKind = MintKind.SKR,
    val prizeText: String = "50000",
    val secret: String = "",
    val pinLen: Int = 4,
    val isDeploying: Boolean = false,
    val showSwapGate: Boolean = false,
)
