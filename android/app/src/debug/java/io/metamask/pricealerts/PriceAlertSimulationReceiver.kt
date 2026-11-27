package io.metamask.pricealerts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import java.util.concurrent.Executors
import org.json.JSONObject

class PriceAlertSimulationReceiver : BroadcastReceiver() {
    private class Simulation : PriceAlertMessagingService() {
        fun dispatch(context: Context, intent: Intent) {
            attachBaseContext(context)
            handleIntent(intent)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val sample = intent.getStringExtra("message") ?: return
        if (sample.length > 4096) return
        val extras = try {
            val payload = JSONObject(sample)
            val notification = payload.getJSONObject("notification")
            val data = payload.getJSONObject("data")
            Bundle().apply {
                data.keys().forEach { putString(it, data.getString(it)) }
                putString("gcm.n.e", "1")
                putString("gcm.n.title", notification.getString("title"))
                putString("gcm.n.body", notification.getString("body"))
                putString("google.message_id", "simulation-${System.nanoTime()}")
            }
        } catch (error: Exception) {
            Log.e("PriceAlert", "Invalid simulation input", error)
            return
        }
        val pending = goAsync()
        val executor = Executors.newSingleThreadExecutor()
        executor.execute {
            try {
                val fcm = Intent("com.google.android.c2dm.intent.RECEIVE").putExtras(extras)
                Simulation().dispatch(context.applicationContext, fcm)
            } finally {
                pending.finish()
                executor.shutdown()
            }
        }
    }
}
