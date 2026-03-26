package com.kreator.vaultgame.data.repo

import com.kreator.vaultgame.BuildConfig
import com.kreator.vaultgame.data.model.WalletState
import android.net.Uri
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult

class MwaWalletRepository(
    private val walletAdapter: MobileWalletAdapter = MobileWalletAdapter(
        connectionIdentity = ConnectionIdentity(
            identityUri = Uri.parse("https://vaultcrack.app"),
            iconUri = Uri.parse("https://vaultcrack.app/icon.png"),
            identityName = "Vault Crack",
        )
    ),
    private val rpc: SolanaRpc = SolanaRpc(BuildConfig.RPC_URI),
) : WalletRepository {
    private var connectedAddress: String? = null
    private var accountLabel: String? = null

    override suspend fun getWalletState(): WalletState {
        val addr = connectedAddress
        if (addr == null) {
            return WalletState(connected = false, address = null, skrBalance = 0, solBalance = 0)
        }

        val solLamports = rpc.getBalanceLamports(addr)
        val sol = (solLamports / 1_000_000_000L)

        val skrUi = rpc.getTokenBalanceUiAmount(addr, BuildConfig.SKR_MINT)
        val skr = skrUi.toLong()

        return WalletState(connected = true, address = short(addr), skrBalance = skr, solBalance = sol)
    }

    override suspend fun connect(sender: ActivityResultSender): WalletState {
        return when (val result = walletAdapter.connect(sender)) {
            is TransactionResult.Success -> {
                val pubkeyBytes = result.authResult.publicKey
                val pubkey = com.funkatronics.encoders.Base58.encodeToString(pubkeyBytes)
                connectedAddress = pubkey
                accountLabel = result.authResult.accountLabel
                walletAdapter.authToken = result.authResult.authToken
                getWalletState()
            }
            is TransactionResult.NoWalletFound -> {
                WalletState(connected = false, address = null, skrBalance = 0, solBalance = 0)
            }
            is TransactionResult.Failure -> {
                WalletState(connected = false, address = null, skrBalance = 0, solBalance = 0)
            }
        }
    }

    override suspend fun disconnect(): WalletState {
        connectedAddress = null
        accountLabel = null
        walletAdapter.authToken = null
        return WalletState(connected = false, address = null, skrBalance = 0, solBalance = 0)
    }

    private fun short(addr: String): String {
        if (addr.length <= 10) return addr
        return addr.take(4) + "…" + addr.takeLast(4)
    }
}
