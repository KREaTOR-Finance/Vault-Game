package com.kreator.vaultgame.ui.screens

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*

/**
 * Lightweight UiEffect pattern (single-consumer, one-shot) used across screens.
 */
class UiEffectBus<E> {
    private val channel = Channel<E>(capacity = Channel.BUFFERED)
    val effects: Flow<E> = channel.receiveAsFlow()
    suspend fun emit(effect: E) { channel.send(effect) }
}
