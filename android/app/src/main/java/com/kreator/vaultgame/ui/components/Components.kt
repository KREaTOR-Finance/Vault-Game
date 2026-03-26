package com.kreator.vaultgame.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.kreator.vaultgame.data.model.MintKind
import com.kreator.vaultgame.data.model.WalletState

@Composable
fun WalletStatusBar(
    wallet: WalletState,
    onConnect: () -> Unit,
    onDisconnect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(tonalElevation = 2.dp, modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (wallet.connected) "Connected" else "Guest",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = wallet.address ?: "Connect wallet to play",
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                wallet.error?.let {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(text = "${wallet.skrBalance} SKR", style = MaterialTheme.typography.labelLarge)
                Text(text = "${wallet.solBalance} SOL", style = MaterialTheme.typography.labelLarge)
                if (wallet.connected) {
                    OutlinedButton(onClick = onDisconnect) { Text("Disconnect") }
                } else {
                    Button(onClick = onConnect) { Text("Connect") }
                }
            }
        }
    }
}

@Composable
fun MintPill(mint: MintKind, modifier: Modifier = Modifier) {
    val label = when (mint) {
        MintKind.SKR -> "SKR"
    }
    val bg = when (mint) {
        MintKind.SKR -> MaterialTheme.colorScheme.primary.copy(alpha = 0.16f)
    }
    val fg = when (mint) {
        MintKind.SKR -> MaterialTheme.colorScheme.primary
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(text = label, style = MaterialTheme.typography.labelLarge, color = fg)
    }
}

@Composable
fun WinnerBadge(
    crackedBy: String?,
    crackedName: String?,
    paidOut: Boolean,
    modifier: Modifier = Modifier,
) {
    val label = when {
        crackedBy == null -> "No winner yet"
        paidOut -> "Paid out"
        else -> "Cracked"
    }

    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelLarge)
            if (crackedBy != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "by ${crackedName ?: crackedBy}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun TxStatusOverlay(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        tonalElevation = 6.dp,
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun SwapGateSheet(
    requiredText: String,
    onSwap: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Need SKR") },
        text = { Text(requiredText) },
        confirmButton = {
            Button(onClick = onSwap) { Text("Swap for SKR") }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Not now") }
        }
    )
}
