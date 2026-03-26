package com.kreator.vaultgame.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.kreator.vaultgame.BuildConfig

@Composable
fun BuildBadge(modifier: Modifier = Modifier) {
    // Always show in debug for alpha sanity.
    if (!BuildConfig.DEBUG) return

    val text = "${BuildConfig.FLAVOR} • ${BuildConfig.RPC_URI} • ${BuildConfig.PROGRAM_ID.take(6)}…"

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(text = text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
