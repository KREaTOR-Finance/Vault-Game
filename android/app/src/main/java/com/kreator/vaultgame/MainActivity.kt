package com.kreator.vaultgame

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import com.kreator.vaultgame.ui.LocalActivityResultSender
import com.kreator.vaultgame.ui.nav.VaultGameNavHost
import com.kreator.vaultgame.ui.theme.SigmaTheme
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleDeepLinkIntent(intent)

        val sender = ActivityResultSender(this)

        setContent {
            CompositionLocalProvider(LocalActivityResultSender provides sender) {
                SigmaTheme {
                    Surface(modifier = Modifier.fillMaxSize()) {
                        VaultGameNavHost()
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handleDeepLinkIntent(intent)
    }

    private fun handleDeepLinkIntent(intent: android.content.Intent?) {
        val uri = intent?.data ?: return
        // Expected: vaultcrack://vault/<vaultPubkey>
        if (uri.scheme != "vaultcrack") return
        if (uri.host != "vault") return
        val pubkey = uri.pathSegments.firstOrNull()?.takeIf { it.isNotBlank() }
        if (pubkey != null) {
            com.kreator.vaultgame.AppLinks.setPendingVault(pubkey)
        }
    }
}
