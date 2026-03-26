package com.kreator.vaultgame.data.repo

import com.kreator.vaultgame.BuildConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*

/**
 * Minimal JSON-RPC client (devnet by default). Keeps dependencies small and predictable.
 *
 * NOTE: We intentionally avoid a full Anchor client. Reads are plain RPC calls.
 */
class SolanaRpc(
    private val endpoint: String = BuildConfig.RPC_URI,
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

    suspend fun getBalanceLamports(owner: String): Long {
        val payload = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getBalance")
            put("params", kotlinx.serialization.json.buildJsonArray {
                add(JsonPrimitive(owner))
                add(buildJsonObject { put("commitment", "confirmed") })
            })
        }

        val resp: RpcResponse<GetBalanceResult> = http.post(endpoint) {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()

        return resp.result?.value ?: 0L
    }

    suspend fun getLatestBlockhash(): String {
        val payload = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getLatestBlockhash")
            put("params", kotlinx.serialization.json.buildJsonArray {
                add(buildJsonObject { put("commitment", "confirmed") })
            })
        }

        val resp: RpcResponse<GetLatestBlockhashResult> = http.post(endpoint) {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()

        return resp.result?.value?.blockhash ?: error("No blockhash")
    }

    suspend fun getAccountInfoBase64(pubkey: String): ByteArray? {
        val payload = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getAccountInfo")
            put("params", kotlinx.serialization.json.buildJsonArray {
                add(JsonPrimitive(pubkey))
                add(buildJsonObject {
                    put("encoding", "base64")
                    put("commitment", "confirmed")
                })
            })
        }

        val resp: RpcResponse<GetAccountInfoResult> = http.post(endpoint) {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()

        val value = resp.result?.value ?: return null
        val dataList = value.data
        if (dataList.isEmpty()) return null
        val b64 = dataList[0]
        return java.util.Base64.getDecoder().decode(b64)
    }

    suspend fun getTokenBalanceUiAmount(owner: String, mint: String): Double {
        // Uses getTokenAccountsByOwner with jsonParsed encoding, sums balances.
        val payload = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getTokenAccountsByOwner")
            put("params", kotlinx.serialization.json.buildJsonArray {
                add(JsonPrimitive(owner))
                add(buildJsonObject { put("mint", mint) })
                add(buildJsonObject {
                    put("encoding", "jsonParsed")
                    put("commitment", "confirmed")
                })
            })
        }

        val resp: RpcResponse<GetTokenAccountsByOwnerResult> = http.post(endpoint) {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()

        val accounts = resp.result?.value ?: emptyList()
        return accounts.sumOf { it.account.data.parsed.info.tokenAmount.uiAmount ?: 0.0 }
    }

    suspend fun getTokenAccountBalanceUiAmount(tokenAccount: String): Double {
        val payload = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "getTokenAccountBalance")
            put("params", kotlinx.serialization.json.buildJsonArray {
                add(JsonPrimitive(tokenAccount))
                add(buildJsonObject { put("commitment", "confirmed") })
            })
        }

        val resp: RpcResponse<GetTokenAccountBalanceResult> = http.post(endpoint) {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()

        return resp.result?.value?.uiAmount ?: 0.0
    }
}

@Serializable
private data class RpcResponse<T>(
    val jsonrpc: String? = null,
    val id: Int? = null,
    val result: T? = null,
    val error: RpcError? = null,
)

@Serializable
private data class RpcError(
    val code: Int? = null,
    val message: String? = null,
)

@Serializable
private data class GetBalanceResult(
    val value: Long,
)

@Serializable
private data class GetLatestBlockhashResult(
    val value: LatestBlockhashValue,
)

@Serializable
private data class LatestBlockhashValue(
    val blockhash: String,
)

@Serializable
private data class GetAccountInfoResult(
    val value: AccountInfoValue? = null,
)

@Serializable
private data class AccountInfoValue(
    // RPC returns [data, encoding]
    val data: List<String> = emptyList(),
)

@Serializable
private data class GetTokenAccountsByOwnerResult(
    val value: List<TokenAccountEntry>,
)

@Serializable
private data class TokenAccountEntry(
    val account: TokenAccountWrapper,
)

@Serializable
private data class TokenAccountWrapper(
    val data: TokenAccountData,
)

@Serializable
private data class TokenAccountData(
    val parsed: Parsed,
)

@Serializable
private data class Parsed(
    val info: ParsedInfo,
)

@Serializable
private data class ParsedInfo(
    val tokenAmount: TokenAmount,
)

@Serializable
private data class TokenAmount(
    val uiAmount: Double? = null,
)

@Serializable
private data class GetTokenAccountBalanceResult(
    val value: TokenAccountBalanceValue,
)

@Serializable
private data class TokenAccountBalanceValue(
    val uiAmount: Double? = null,
)
