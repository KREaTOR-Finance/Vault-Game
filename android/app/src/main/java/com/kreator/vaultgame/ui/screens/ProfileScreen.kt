@file:OptIn(ExperimentalMaterial3Api::class)

package com.kreator.vaultgame.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun ProfileScreen(
    onOpenVault: (String) -> Unit,
    vm: ProfileViewModel = viewModel(),
) {
    val state by vm.state.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Profile") }) }) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            Surface(tonalElevation = 2.dp) {
                Column(Modifier.padding(16.dp)) {
                    Text("Stats", style = MaterialTheme.typography.titleMedium)
                    Text("Attempts: ${state.attempts} • Wins: ${state.wins}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Streak: ${state.streakDays}d • XP: ${state.xp}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Text("My Vaults", modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.titleMedium)
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.myVaultIds) { id ->
                    OutlinedButton(onClick = { onOpenVault(id) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Open $id")
                    }
                }
            }
        }
    }
}

data class ProfileUiState(
    val attempts: Int = 42,
    val wins: Int = 3,
    val streakDays: Int = 7,
    val xp: Int = 1337,
    val myVaultIds: List<String> = listOf("v001", "v002"),
)
