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
fun CrackScreen(
    vaultId: String,
    onResult: () -> Unit,
    onBack: () -> Unit,
    vm: CrackViewModel = viewModel(factory = CrackViewModel.factory(vaultId)),
) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Crack") },
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
            Text(
                text = "Enter ${state.targetLen}-digit code",
                style = MaterialTheme.typography.titleMedium
            )

            com.kreator.vaultgame.ui.components.PinPad(
                value = state.guess,
                targetLen = state.targetLen,
                onChange = vm::setGuess,
            )

            Text(
                text = "Global fee: ${state.feeText} (next: ${state.nextFeeText})",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            val sender = com.kreator.vaultgame.ui.LocalActivityResultSender.current
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = {
                        val s = sender ?: return@Button
                        vm.submitPaidAttempt(s) { onResult() }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !state.isSubmitting && state.guess.length == state.targetLen && sender != null
                ) { Text("Submit") }
                OutlinedButton(
                    onClick = {
                        val s = sender ?: return@OutlinedButton
                        vm.submitFreeTry(s) { onResult() }
                    },
                    enabled = !state.isSubmitting && sender != null
                ) { Text("Free Try") }
            }

            if (state.isSubmitting) {
                TxStatusOverlay(title = "Transmitting payload…", body = "Awaiting confirmation…")
            }

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

data class CrackUiState(
    val guess: String = "",
    val targetLen: Int = 4,
    val feeText: String = "—",
    val nextFeeText: String = "—",
    val isSubmitting: Boolean = false,
    val error: String? = null,
)
