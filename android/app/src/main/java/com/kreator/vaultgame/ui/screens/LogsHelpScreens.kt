@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LogsScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Logs") },
                navigationIcon = { IconButton(onClick = onBack) { Text("<") } }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Console", style = MaterialTheme.typography.titleMedium)
            Text("> tx: (mock) 5rY…confirmed\n> error: none\n> hint: keep it readable.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun HelpScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Help") },
                navigationIcon = { IconButton(onClick = onBack) { Text("<") } }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("How it works", style = MaterialTheme.typography.titleMedium)
            Text(
                "• Create a vault by depositing SKR (primary) or SOL (fallback).\n" +
                    "• Crack by submitting attempts; each attempt feeds the Mega Vault (treasury rake) and the winner pool.\n" +
                    "• If you crack it: claim immediately.\n" +
                    "• Daily free try: 1 per UTC day.",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
