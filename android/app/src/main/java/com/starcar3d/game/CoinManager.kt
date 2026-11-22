package com.starcar3d.game

import android.content.Context
import android.content.SharedPreferences

/**
 * Offline native coin persistence backed by dedicated Android SharedPreferences.
 *
 * Fresh installation initializes the coin balance to 0 once and sets an install flag.
 * Closing and reopening the app preserves the saved balance.
 * Because `star_car_3d_coins_prefs.xml` is excluded from Android Auto Backup and
 * Device Transfer, uninstalling and reinstalling starts cleanly from 0.
 */
class CoinManager(context: Context) {

    companion object {
        const val PREFS_NAME = "star_car_3d_coins_prefs"
        private const val KEY_COIN_BALANCE = "coin_balance"
        private const val KEY_INSTALL_INITIALIZED = "install_initialized"
    }

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    init {
        ensureFreshInstallInitialized()
    }

    @Synchronized
    private fun ensureFreshInstallInitialized() {
        if (!prefs.getBoolean(KEY_INSTALL_INITIALIZED, false)) {
            prefs.edit()
                .putInt(KEY_COIN_BALANCE, 0)
                .putBoolean(KEY_INSTALL_INITIALIZED, true)
                .commit()
        }
    }

    @Synchronized
    fun getCoins(): Int {
        ensureFreshInstallInitialized()
        return prefs.getInt(KEY_COIN_BALANCE, 0).coerceAtLeast(0)
    }

    @Synchronized
    fun setCoins(amount: Int): Int {
        ensureFreshInstallInitialized()
        val sanitized = amount.coerceAtLeast(0)
        prefs.edit()
            .putInt(KEY_COIN_BALANCE, sanitized)
            .commit()
        return sanitized
    }

    @Synchronized
    fun addCoins(delta: Int): Int {
        ensureFreshInstallInitialized()
        if (delta <= 0) {
            return getCoins()
        }
        val current = prefs.getInt(KEY_COIN_BALANCE, 0).coerceAtLeast(0)
        val updated = (current.toLong() + delta.toLong()).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
        prefs.edit()
            .putInt(KEY_COIN_BALANCE, updated)
            .commit()
        return updated
    }

    /**
     * Deducts [amount] coins if sufficient balance exists.
     * Returns the new persisted balance (>= 0), or -1 if insufficient funds.
     */
    @Synchronized
    fun spendCoins(amount: Int): Int {
        ensureFreshInstallInitialized()
        if (amount < 0) return -1
        val current = prefs.getInt(KEY_COIN_BALANCE, 0).coerceAtLeast(0)
        if (current < amount) {
            return -1
        }
        val updated = current - amount
        prefs.edit()
            .putInt(KEY_COIN_BALANCE, updated)
            .commit()
        return updated
    }
}
