package com.kreator.vaultgame.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun PinDots(
    value: String,
    targetLen: Int,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(targetLen) { idx ->
            val filled = idx < value.length
            val c = if (filled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(c)
            )
        }
    }
}

@Composable
fun PinPad(
    value: String,
    targetLen: Int,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    fun addDigit(d: String) {
        if (value.length >= targetLen) return
        onChange(value + d)
    }

    fun backspace() {
        if (value.isEmpty()) return
        onChange(value.dropLast(1))
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        tonalElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            PinDots(value = value, targetLen = targetLen)
            Text(
                text = "${value.length} / $targetLen",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            val rows = listOf(
                listOf("1","2","3"),
                listOf("4","5","6"),
                listOf("7","8","9"),
                listOf("⌫","0","CLR"),
            )

            rows.forEach { r ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    r.forEach { key ->
                        PinKey(
                            label = key,
                            modifier = Modifier.weight(1f),
                            onClick = {
                                when (key) {
                                    "⌫" -> backspace()
                                    "CLR" -> onChange("")
                                    else -> addDigit(key)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PinKey(
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val bg = MaterialTheme.colorScheme.surfaceVariant
    val fg = MaterialTheme.colorScheme.onSurface

    Box(
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = fg,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center
        )
    }
}
