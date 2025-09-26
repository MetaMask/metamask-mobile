package io.metamask.nativeModules

import android.content.Intent
import android.os.Bundle
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap

class NotificationModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    private var savedNotificationData: Bundle? = null

    private val FCM_KEYS = setOf(
      "google.message_id", "google.sent_time", "google.ttl",
      "google.original_priority", "google.delivered_priority",
      "from", "collapse_key", "google.c.a.c_id", "google.c.a.c_l",
      "google.c.a.e", "google.c.a.ts", "google.c.a.udt",
      "gcm.n.title", "gcm.n.body", "gcm.n.icon", "gcm.n.sound",
      "gcm.n.color", "gcm.n.tag", "gcm.n.click_action",
      "gcm.notification.title", "gcm.notification.body",
      "gcm.notification.icon", "gcm.notification.sound",
      "gcm.notification.color", "gcm.notification.tag",
      "gcm.notification.click_action"
    )

    fun saveNotificationIntent(intent: Intent?) {
      intent?.extras?.let { extras ->
        val hasFCMData = extras.keySet().any { key ->
          FCM_KEYS.contains(key) ||
            key.startsWith("google.") ||
            key.startsWith("gcm.") ||
            (key != "profile" && !key.contains("android"))
        }

        if (hasFCMData) {
          savedNotificationData = Bundle(extras)
        }
      }
    }
  }

  override fun getName(): String = "NotificationModule"

  @ReactMethod
  fun getInitialNotification(promise: Promise) {
    try {
      savedNotificationData?.let { data ->
        val result = createRemoteMessageStructure(data)
        promise.resolve(result)
        // Clear after reading
        savedNotificationData = null
      } ?: promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message)
    }
  }

  private fun createRemoteMessageStructure(data: Bundle): WritableNativeMap {
    val result = WritableNativeMap()
    val dataMap = WritableNativeMap()
    val notificationMap = WritableNativeMap()

    data.keySet()
      .filterNot { it == "profile" || it.contains("UserHandle") }
      .forEach { key ->
        // Use specific Bundle methods instead of deprecated get()
        val value: Any = when {
          data.containsKey(key) -> {
            // Try different types in order of likelihood
            data.getString(key)
              ?: data.getLong(key, -1).takeIf { it != -1L }
              ?: data.getInt(key, -1).takeIf { it != -1 }
              ?: data.getBundle(key)
              ?: data.getBoolean(key, false)
          }

          else -> null
        } ?: return@forEach

        when (key) {
          "google.message_id" -> result.putString("messageId", value.toString())
          "from" -> result.putString("from", value.toString())
          "collapse_key" -> result.putString("collapseKey", value.toString())
          "google.sent_time" -> when (value) {
            is Long -> result.putDouble("sentTime", value.toDouble())
            else -> value.toString().toLongOrNull()?.let {
              result.putDouble("sentTime", it.toDouble())
            }
          }

          "google.ttl" -> when (value) {
            is Int -> result.putInt("ttl", value)
            else -> value.toString().toIntOrNull()?.let {
              result.putInt("ttl", it)
            }
          }

          "gcm.notification.title", "gcm.n.title" ->
            notificationMap.putString("title", value.toString())

          "gcm.notification.body", "gcm.n.body" ->
            notificationMap.putString("body", value.toString())

          else -> {
            // Custom data fields (skip Google/GCM internal keys)
            if (!key.startsWith("google.") && !key.startsWith("gcm.")) {
              dataMap.putString(key, value.toString())
            }
          }
        }
      }

    result.putMap("data", dataMap)
    if (notificationMap.hasKey("title") || notificationMap.hasKey("body")) {
      result.putMap("notification", notificationMap)
    }

    return result
  }
}
