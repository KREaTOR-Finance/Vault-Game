package com.kreator.vaultgame.data.repo

import com.kreator.vaultgame.data.mock.MockData
import com.kreator.vaultgame.data.model.*
import kotlinx.coroutines.delay

interface WalletRepository {
    suspend fun getWalletState(): WalletState
    suspend fun connect(sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender): WalletState
    suspend fun disconnect(): WalletState
}

interface VaultRepository {
    suspend fun listVaults(): List<VaultCardModel>
    suspend fun getVaultDetail(vaultId: String): VaultDetailModel

    suspend fun submitPaidAttempt(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
        guess: String,
    ): AttemptResultModel

    suspend fun submitFreeTry(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
        guess: String,
    ): AttemptResultModel

    suspend fun claimPrize(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
    ): Boolean
}

interface NameRepository {
    suspend fun reverseResolveSkrName(address: String): String?
}

class MockWalletRepository : WalletRepository {
    private var state: WalletState = MockData.walletConnected

    override suspend fun getWalletState(): WalletState {
        delay(150)
        return state
    }

    override suspend fun connect(sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender): WalletState {
        delay(300)
        state = MockData.walletConnected
        return state
    }

    override suspend fun disconnect(): WalletState {
        delay(150)
        state = MockData.walletGuest
        return state
    }
}

class LiveVaultRepository(
    private val rpc: SolanaRpc = SolanaRpc(),
    private val directory: VaultDirectoryApi = VaultDirectoryApi(),
    private val walletAdapter: com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter = com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter(
        connectionIdentity = com.solana.mobilewalletadapter.clientlib.ConnectionIdentity(
            identityUri = android.net.Uri.parse("https://vaultcrack.app"),
            iconUri = android.net.Uri.parse("https://vaultcrack.app/icon.png"),
            identityName = "Vault Crack",
        )
    ),
) : VaultRepository {
    override suspend fun listVaults(): List<VaultCardModel> {
        // Vault discovery comes from hosted directory.
        val pubkeys = directory.listVaultPubkeys(cluster = "devnet")
        if (pubkeys.isEmpty()) return emptyList()

        // For alpha, build cards by fetching each vault account (simple + robust).
        return pubkeys.take(50).mapNotNull { pk ->
            runCatching { getVaultDetail(pk).card }.getOrNull()
        }
    }

    override suspend fun getVaultDetail(vaultId: String): VaultDetailModel {
        val data = rpc.getAccountInfoBase64(vaultId) ?: error("Vault account not found")
        val v = VaultReader.decode(data)

        val mint = MintKind.SKR
        val prize = Amount(mint, v.prizeAmount)
        val fee = Amount(mint, v.currentFee)

        val card = VaultCardModel(
            id = vaultId,
            title = "VAULT ${v.vaultId}",
            mint = mint,
            prize = prize,
            currentFee = fee,
            attempts = v.attemptCount.toInt(),
            endTs = java.time.Instant.ofEpochSecond(v.endTs),
            status = when (v.status) {
                1 -> VaultStatus.ACTIVE
                2 -> VaultStatus.SETTLED
                3 -> VaultStatus.CANCELLED
                else -> VaultStatus.ACTIVE
            },
            winnerAddress = v.winner?.let { short(it) },
            settledAt = v.settledAt?.let { java.time.Instant.ofEpochSecond(it) },
            paidOut = v.paidOut,
        )

        // v1: exact fee progression = current_fee, then +fee_step per attempt.
        val preview = (0..4).map { i ->
            val feeI = (v.currentFee + (v.feeStep * i)).coerceAtLeast(0)
            Amount(mint, feeI)
        }

        return VaultDetailModel(
            card = card,
            pinLen = v.pinLen,
            feeLadderPreview = preview,
            rakeBpsMega = 2000,
            rakeBpsWinner = 8000,
            dailyFreeTryAvailable = true,
        )
    }

    override suspend fun submitPaidAttempt(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
        guess: String,
    ): AttemptResultModel {
        // v1 rails: the on-chain attempt instruction has NO guess argument (guess verification is off-chain).
        // The UI still collects a PIN; we include it only in local analytics/logs later.
        val recent = rpc.getLatestBlockhash()
        val programId = SolanaAddresses.programId
        val vault = com.solana.publickey.SolanaPublicKey.from(vaultId)
        val megaVault = SolanaAddresses.megaVaultPda()
        val mint = com.solana.publickey.SolanaPublicKey.from(com.kreator.vaultgame.BuildConfig.SKR_MINT)

        return when (val txRes = walletAdapter.transact(sender) { auth ->
            val player = com.solana.publickey.SolanaPublicKey(auth.accounts.first().publicKey)
            val ix = VaultGameIxs.attemptSpl(
                programId = programId,
                vault = vault,
                megaVault = megaVault,
                feeMint = mint,
                player = player,
            )

            val msg = com.solana.transaction.Message.Builder()
                .addInstruction(ix)
                .setRecentBlockhash(recent)
                .build()

            val tx = com.solana.transaction.Transaction(msg).serialize()
            val sigs = signAndSendTransactions(arrayOf(tx)).signatures
            val sig = sigs.firstOrNull() ?: error("No signature returned")
            com.funkatronics.encoders.Base58.encodeToString(sig)
        }) {
            is com.solana.mobilewalletadapter.clientlib.TransactionResult.Success -> {
                AttemptResultModel(success = true, message = "Attempt sent", signature = txRes.payload)
            }
            is com.solana.mobilewalletadapter.clientlib.TransactionResult.NoWalletFound -> {
                AttemptResultModel(success = false, message = "No wallet found", signature = null)
            }
            is com.solana.mobilewalletadapter.clientlib.TransactionResult.Failure -> {
                AttemptResultModel(success = false, message = txRes.message ?: "Transaction failed", signature = null)
            }
        }
    }

    override suspend fun submitFreeTry(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
        guess: String,
    ): AttemptResultModel {
        // v1 program currently has no free try instruction; we treat this as a normal attempt for now.
        return submitPaidAttempt(sender, vaultId, guess)
    }

    override suspend fun claimPrize(
        sender: com.solana.mobilewalletadapter.clientlib.ActivityResultSender,
        vaultId: String,
    ): Boolean {
        val data = rpc.getAccountInfoBase64(vaultId) ?: error("Vault account not found")
        val v = VaultReader.decode(data)
        val winner = v.winner ?: error("No winner set yet")

        val recent = rpc.getLatestBlockhash()
        val programId = SolanaAddresses.programId
        val vault = com.solana.publickey.SolanaPublicKey.from(vaultId)
        val mint = com.solana.publickey.SolanaPublicKey.from(com.kreator.vaultgame.BuildConfig.SKR_MINT)

        return when (val txRes = walletAdapter.transact(sender) { auth ->
            val player = com.solana.publickey.SolanaPublicKey(auth.accounts.first().publicKey)
            // Must be the winner
            if (player.base58() != winner) error("Connected wallet is not the winner")

            val ixes = mutableListOf<com.solana.transaction.TransactionInstruction>()

            val winnerAta = SolanaAddresses.associatedTokenAddress(player, mint)
            val winnerAtaExists = rpc.getAccountInfoBase64(winnerAta.base58()) != null
            if (!winnerAtaExists) {
                ixes += VaultGameIxs.createAta(player, player, mint)
            }

            ixes += VaultGameIxs.claimSpl(
                programId = programId,
                vault = vault,
                feeMint = mint,
                winner = player,
            )

            val mb = com.solana.transaction.Message.Builder().setRecentBlockhash(recent)
            ixes.forEach { mb.addInstruction(it) }
            val msg = mb.build()
            val tx = com.solana.transaction.Transaction(msg).serialize()

            val sigs = signAndSendTransactions(arrayOf(tx)).signatures
            val sig = sigs.firstOrNull() ?: error("No signature returned")
            com.funkatronics.encoders.Base58.encodeToString(sig)
        }) {
            is com.solana.mobilewalletadapter.clientlib.TransactionResult.Success -> true
            else -> false
        }
    }

    private fun short(addr: String): String {
        if (addr.length <= 10) return addr
        return addr.take(4) + "…" + addr.takeLast(4)
    }
}

class MockNameRepository : NameRepository {
    override suspend fun reverseResolveSkrName(address: String): String? {
        delay(120)
        return null
    }
}
