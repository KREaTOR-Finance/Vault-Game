package com.kreator.vaultgame.ui.components

import kotlin.math.ceil

/**
 * Display costs as rounded whole units (SKR/SOL). We round UP so users never see less than they'll pay.
 * Assumes mint has 6 decimals for SKR test mint; SOL lamports handled separately later.
 */
object AmountFormat {
    fun wholeFromMinor(minorUnits: Long, decimals: Int): Long {
        if (minorUnits <= 0) return 0
        val denom = Math.pow(10.0, decimals.toDouble())
        return ceil(minorUnits.toDouble() / denom).toLong()
    }
}
