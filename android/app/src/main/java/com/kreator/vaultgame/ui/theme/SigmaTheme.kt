package com.kreator.vaultgame.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// "Modern UI wearing a terminal skin": dark CRT base, neon accents.
private val SigmaDark: ColorScheme = darkColorScheme(
    primary = Color(0xFF48FFB5),
    onPrimary = Color(0xFF00140C),
    secondary = Color(0xFF6DE2FF),
    onSecondary = Color(0xFF001018),
    tertiary = Color(0xFFFF4FD8),
    onTertiary = Color(0xFF1B0013),

    background = Color(0xFF05070A),
    onBackground = Color(0xFFEAFEF6),
    surface = Color(0xFF0A0F12),
    onSurface = Color(0xFFEAFEF6),

    surfaceVariant = Color(0xFF0E171B),
    onSurfaceVariant = Color(0xFFB7D6C9),

    error = Color(0xFFFF6B6B),
    onError = Color(0xFF240000),
    outline = Color(0xFF1F3B33)
)

@Composable
fun SigmaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // For v0 we only ship dark; if someone forces light mode, keep dark anyway.
    val scheme = SigmaDark

    MaterialTheme(
        colorScheme = scheme,
        typography = SigmaTypography,
        content = content
    )
}
