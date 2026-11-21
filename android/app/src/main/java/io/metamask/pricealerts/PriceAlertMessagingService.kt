package io.metamask.pricealerts

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.braze.push.BrazeFirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingReceiver
import io.metamask.MainActivity
import io.metamask.R
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

private const val RECEIVE = "com.google.android.c2dm.intent.RECEIVE"
private const val CHANNEL = "DEFAULT_NOTIFICATION_CHANNEL_ID"

private data class PriceAlert(
    val symbol: String, val asset: String, val kind: String, val price: Double,
    val change: Double, val context: String, val target: Double?, val chart: List<Double>?,
) {
    companion object {
        private val symbolPattern = Regex("[A-Z0-9]{1,12}")
        private val assetPattern = Regex("[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}/[-a-z0-9]{3,8}:[-.%a-zA-Z0-9]{1,128}")
        private val numberPattern = Regex("-?[0-9]+(\\.[0-9]+)?")
        private fun isPrice(value: Double) = value > 0 && value <= 1e12
        private fun decimal(value: String?) = value?.takeIf(numberPattern::matches)?.toDoubleOrNull()?.takeIf(Double::isFinite)

        fun parse(data: Map<String, String>): PriceAlert? {
            if (data["mm_delivery"] != "price_alert" || data["mm_ui"] != "price_alert@1") return null
            val symbol = data["symbol"]?.takeIf(symbolPattern::matches) ?: return null
            val asset = data["asset_id"]?.takeIf(assetPattern::matches) ?: return null
            val price = decimal(data["price"])?.takeIf(::isPrice) ?: return null
            val change = decimal(data["change_pct"])?.takeIf { kotlin.math.abs(it) <= 1e6 } ?: return null
            val kind = data["kind"] ?: return null
            val target: Double?
            val context: String
            when (kind) {
                "threshold" -> {
                    target = decimal(data["target"])?.takeIf(::isPrice) ?: return null
                    val direction = when (data["direction"]) {
                        "above" -> "Above"
                        "below" -> "Below"
                        else -> return null
                    }
                    context = "$direction ${usd(target)}"
                }
                "movement" -> {
                    target = null
                    context = data["period"]?.takeIf { it in setOf("5m", "1h", "24h") } ?: return null
                }
                else -> return null
            }
            return PriceAlert(symbol, asset, kind, price, change, context, target, chart(data["chart"], price))
        }

        private fun chart(raw: String?, price: Double): List<Double>? = runCatching {
            if (raw == null || raw.toByteArray().size > 2048) return null
            val chart = JSONObject(raw)
            if ((chart.opt("v") as? Number)?.toDouble() != 1.0 || chart.opt("currency") != "usd") return null
            val start = (chart.opt("start") as? Number)?.toDouble() ?: return null
            val step = (chart.opt("interval") as? Number)?.toDouble() ?: return null
            val values = chart.getJSONArray("prices")
            if (start !in 1.0..253402214399.0 || start % 1 != 0.0 || step <= 0 || step % 1 != 0.0 ||
                values.length() !in 49..97 || (values.length() - 1) * step != 86400.0) return null
            List(values.length()) { i ->
                val value = (values.get(i) as? Number)?.toDouble()?.takeIf(::isPrice) ?: return null
                if (i == values.length() - 1) price else value
            }
        }.getOrNull()
    }

    val title get() = "$symbol · ${usd(price)}"
    val delta get() = "${if (change >= 0) "+" else ""}${change}%"

    fun link(swap: Boolean): Uri = Uri.Builder().scheme("https").authority("link.metamask.io")
        .appendPath(if (swap) "swap" else "asset").apply {
            if (swap) appendQueryParameter("from", asset)
            else appendQueryParameter("assetId", asset).appendQueryParameter("source", "price_alert_notification")
                .appendQueryParameter("alert_type", kind).appendQueryParameter("price_at_trigger", price.toString())
        }.build()

    fun picture(): Bitmap {
        val bitmap = Bitmap.createBitmap(900, if (chart == null) 225 else 450, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val green = Color.rgb(102, 224, 154)
        val red = Color.rgb(255, 136, 138)
        val accent = if (change >= 0) green else red
        paint.shader = LinearGradient(0f, 0f, 900f, bitmap.height.toFloat(), 0xff28232f.toInt(), 0xff100f12.toInt(), Shader.TileMode.CLAMP)
        canvas.drawPaint(paint)
        paint.shader = null
        fun text(value: String, x: Float, y: Float, size: Float, color: Int = Color.WHITE) {
            paint.color = color
            paint.textSize = size
            paint.typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD)
            canvas.drawText(value, x, y, paint)
        }
        text("$symbol  ·  MetaMask", 42f, 57f, 28f)
        text(usd(price), 42f, 135f, 62f)
        paint.color = accent
        paint.alpha = 45
        canvas.drawRoundRect(650f, 88f, 858f, 149f, 30f, 30f, paint)
        text(delta, 670f, 127f, 28f, accent)
        text(context, 42f, 194f, 27f, 0xffdfd8e5.toInt())
        chart?.let { prices ->
            val low = prices.min()
            val high = prices.max()
            val floor = minOf(low, target ?: low)
            val range = maxOf(high, target ?: high) - floor
            fun y(value: Double) = if (range == 0.0) 310f else (380 - (value - floor) / range * 149).toFloat()
            fun x(i: Int) = 42f + i * (if (target == null) 812f else 632f) / prices.lastIndex
            if (target != null) {
                paint.color = 0xffb5a8bd.toInt()
                paint.strokeWidth = 2f
                paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(7f, 7f), 0f)
                canvas.drawLine(42f, y(target), 690f, y(target), paint)
                paint.pathEffect = null
                text(usd(target), 702f, y(target) + 8f, 24f, paint.color)
            }
            val path = Path().apply {
                moveTo(x(0), y(prices.first()))
                for (i in 1..prices.lastIndex) {
                    val mid = (x(i - 1) + x(i)) / 2
                    cubicTo(mid, y(prices[i - 1]), mid, y(prices[i]), x(i), y(prices[i]))
                }
            }
            paint.color = accent
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 5f
            canvas.drawPath(path, paint)
            paint.style = Paint.Style.FILL
            setOf(prices.indexOf(low), prices.indexOf(high), prices.lastIndex).forEach { i -> canvas.drawCircle(x(i), y(prices[i]), 7f, paint) }
            text("24h", 42f, 422f, 24f)
            text("High ${usd(high)} · Low ${usd(low)}", 415f, 422f, 24f)
        }
        return bitmap
    }
}

private fun usd(value: Double): String = NumberFormat.getCurrencyInstance(Locale.US).apply {
    maximumFractionDigits = if (value >= 1) 2 else 8
}.format(value)

class PriceAlertMessagingReceiver : ReactNativeFirebaseMessagingReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val message = intent.extras?.let(::RemoteMessage)
        if (message?.notification != null && !BrazeFirebaseMessagingService.isBrazePushNotification(message) &&
            PriceAlert.parse(message.data) != null) return
        super.onReceive(context, intent)
    }
}

open class PriceAlertMessagingService : BrazeFirebaseMessagingService() {
    private var fallbackIntent: Intent? = null

    override fun handleIntent(intent: Intent) {
        if (intent.action != RECEIVE || intent.getStringExtra("message_type")?.let { it != "gcm" } == true) {
            super.handleIntent(intent)
            return
        }
        val message = intent.extras?.let(::RemoteMessage)
        val alert = message?.takeIf { it.notification != null && !BrazeFirebaseMessagingService.isBrazePushNotification(it) }
            ?.let { PriceAlert.parse(it.data) }
        if (alert == null) {
            super.handleIntent(intent)
            return
        }
        try {
            post(alert, message?.messageId ?: alert.link(false).toString())
        } catch (error: Exception) {
            Log.w("PriceAlert", "Native display failed; handing message to Firebase", error)
            fallbackIntent = intent
            try { super.handleIntent(intent) } finally { fallbackIntent = null }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        fallbackIntent?.let { ReactNativeFirebaseMessagingReceiver().onReceive(applicationContext, it) }
    }

    private fun post(alert: PriceAlert, tag: String) {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "Transaction Complete", NotificationManager.IMPORTANCE_HIGH).apply {
                enableLights(true)
                enableVibration(true)
            })
        }
        fun action(swap: Boolean, code: Int): PendingIntent = PendingIntent.getActivity(
            this, 31 * tag.hashCode() + code,
            Intent(Intent.ACTION_VIEW, alert.link(swap), this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.mipmap.ic_notification_small)
            .setContentTitle(alert.title).setContentText("${alert.context} · ${alert.delta}")
            .setStyle(NotificationCompat.BigPictureStyle().bigPicture(alert.picture()))
            .setContentIntent(action(false, 0)).setAutoCancel(true).setOnlyAlertOnce(true)
            .addAction(0, "View token", action(false, 1)).addAction(0, "Swap", action(true, 2))
            .build()
        manager.notify("price-alert-$tag", 1, notification)
    }
}
