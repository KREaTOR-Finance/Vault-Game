package com.kreator.vaultgame.data.repo

import com.kreator.vaultgame.BuildConfig
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Reads the VaultCrack vault directory from the hosted backend (Vercel).
 *
 * Android should NOT talk to Supabase directly (no keys in APK).
 */
class VaultDirectoryApi(
    private val baseUrl: String = BuildConfig.DIRECTORY_API_BASE,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val http = HttpClient(Android) {
        install(ContentNegotiation) {
            json(json)
        }
    }

    suspend fun listVaultPubkeys(cluster: String = "devnet"): List<String> {
        if (baseUrl.isBlank()) return emptyList()
        val url = baseUrl.trimEnd('/') + "/api/v1/vaults?cluster=$cluster"
        val resp: VaultsResponse = http.get(url) {
            accept(ContentType.Application.Json)
        }.body()
        return resp.vaults.mapNotNull { it.vault_pubkey?.takeIf { v -> v.isNotBlank() } }
    }
}

@Serializable
private data class VaultsResponse(
    val vaults: List<VaultRow> = emptyList(),
)

@Serializable
private data class VaultRow(
    val vault_pubkey: String? = null,
)
