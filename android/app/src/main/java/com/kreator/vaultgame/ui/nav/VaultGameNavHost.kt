package com.kreator.vaultgame.ui.nav

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.kreator.vaultgame.ui.screens.*

@Composable
fun VaultGameNavHost(modifier: Modifier = Modifier) {
    val nav = rememberNavController()

    NavHost(
        navController = nav,
        startDestination = Route.Welcome.path,
        modifier = modifier
    ) {
        composable(Route.Splash.path) {
            // Reserved for future (splash/animations). Route directly to Welcome for now.
            SplashScreen(
                state = com.kreator.vaultgame.ui.screens.SplashUiState(isLoading = false),
                onContinue = { nav.navigate(Route.Welcome.path) { popUpTo(Route.Splash.path) { inclusive = true } } }
            )
        }

        composable(Route.Welcome.path) {
            WelcomeScreen(
                onConnectedToMega = { megaVaultPubkey ->
                    nav.navigate(Route.VaultDetail.build(megaVaultPubkey)) {
                        popUpTo(Route.Welcome.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Home.path) {
            HomeScreen(
                onOpenVault = { nav.navigate(Route.VaultDetail.build(it)) },
                onCreateVault = { nav.navigate(Route.CreateVault.path) },
                onProfile = { nav.navigate(Route.Profile.path) },
                onMega = { nav.navigate(Route.Mega.path) },
                onLogs = { nav.navigate(Route.Logs.path) },
                onHelp = { nav.navigate(Route.Help.path) },
            )
        }

        composable(Route.CreateVault.path) {
            CreateVaultScreen(
                onDone = { nav.popBackStack() },
            )
        }

        composable(Route.Mega.path) {
            MegaScreen(onOpenVault = { nav.navigate(Route.VaultDetail.build(it)) })
        }

        composable(Route.Profile.path) {
            ProfileScreen(onOpenVault = { nav.navigate(Route.VaultDetail.build(it)) })
        }

        composable(Route.Logs.path) {
            LogsScreen(onBack = { nav.popBackStack() })
        }

        composable(Route.Help.path) {
            HelpScreen(onBack = { nav.popBackStack() })
        }

        composable(
            route = Route.VaultDetail.path,
            arguments = listOf(navArgument(ARG_VAULT_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val vaultId = backStackEntry.arguments?.getString(ARG_VAULT_ID) ?: return@composable
            VaultDetailScreen(
                vaultId = vaultId,
                onCrack = { nav.navigate(Route.Crack.build(vaultId)) },
                onClaim = { nav.navigate(Route.Claim.build(vaultId)) },
                onBack = { nav.popBackStack() },
            )
        }

        composable(
            route = Route.Crack.path,
            arguments = listOf(navArgument(ARG_VAULT_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val vaultId = backStackEntry.arguments?.getString(ARG_VAULT_ID) ?: return@composable
            CrackScreen(
                vaultId = vaultId,
                onResult = { nav.navigate(Route.Result.build(vaultId)) },
                onBack = { nav.popBackStack() },
            )
        }

        composable(
            route = Route.Result.path,
            arguments = listOf(navArgument(ARG_VAULT_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val vaultId = backStackEntry.arguments?.getString(ARG_VAULT_ID) ?: return@composable
            ResultScreen(
                vaultId = vaultId,
                onTryAgain = { nav.navigate(Route.Crack.build(vaultId)) },
                onClaim = { nav.navigate(Route.Claim.build(vaultId)) },
                onBackToVault = { nav.navigate(Route.VaultDetail.build(vaultId)) },
            )
        }

        composable(
            route = Route.Claim.path,
            arguments = listOf(navArgument(ARG_VAULT_ID) { type = NavType.StringType })
        ) { backStackEntry ->
            val vaultId = backStackEntry.arguments?.getString(ARG_VAULT_ID) ?: return@composable
            ClaimScreen(
                vaultId = vaultId,
                onDone = { nav.navigate(Route.Home.path) { popUpTo(Route.Home.path) { inclusive = false } } },
                onBack = { nav.popBackStack() },
            )
        }
    }
}
