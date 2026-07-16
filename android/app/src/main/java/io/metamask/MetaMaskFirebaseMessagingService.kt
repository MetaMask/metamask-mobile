package io.metamask

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.braze.push.BrazeFirebaseMessagingService
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.common.ReactNativeFirebaseEventEmitter
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingSerializer

private const val TAG = "MetaMaskFCM"

/**
 * Only one FirebaseMessagingService can be declared for com.google.firebase.MESSAGING_EVENT, so
 * this app can't register both Braze's and react-native-firebase's services directly. Braze's own
 * "fallback FCM service" (reflectively forwarding to RNFB when a message isn't from Braze) does
 * not work here: `ReactNativeFirebaseMessagingService.onMessageReceived` is a documented no-op
 * ("handled in receiver") in this RNFB version — its real delivery path is
 * `ReactNativeFirebaseMessagingReceiver`, which listens for the legacy
 * `com.google.android.c2dm.intent.RECEIVE` broadcast that modern FCM delivery never sends. So
 * Braze's reflective call invokes a no-op and the message never reaches JS while the app is
 * foregrounded (background/killed still works because the OS displays `notification`-payload
 * pushes directly, without invoking any service).
 *
 * This service is registered as the sole MESSAGING_EVENT target instead, and does both jobs
 * directly using each SDK's public API: hands Braze pushes to Braze's own handler, and replicates
 * RNFB's real (working) delivery for everything else by calling its serializer + event emitter.
 */
class MetaMaskFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)
    Log.d(
      TAG,
      "onMessageReceived: messageId=${remoteMessage.messageId} " +
        "hasNotification=${remoteMessage.notification != null} " +
        "dataKeys=${remoteMessage.data.keys}",
    )

    val handledByBraze =
      BrazeFirebaseMessagingService.handleBrazeRemoteMessage(applicationContext, remoteMessage)
    Log.d(TAG, "handleBrazeRemoteMessage returned: $handledByBraze")
    if (handledByBraze) {
      Log.d(TAG, "Message consumed by Braze, not forwarding to RNFB")
      return
    }

    val emitter = ReactNativeFirebaseEventEmitter.getSharedInstance()
    Log.d(TAG, "Emitter listeners before send: ${emitter.listenersMap}")

    Log.d(TAG, "Forwarding message to RNFB via ReactNativeFirebaseEventEmitter")
    emitter.sendEvent(ReactNativeFirebaseMessagingSerializer.remoteMessageToEvent(remoteMessage, false))
    Log.d(TAG, "sendEvent called")

    // sendEvent() posts its real work (checking listeners, emit()) to the main-thread handler
    // asynchronously, so check listener/queue state slightly after rather than synchronously here.
    Handler(Looper.getMainLooper()).postDelayed({
      Log.d(TAG, "Emitter listeners 1s after send: ${emitter.listenersMap}")
    }, 1000)
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    Log.d(TAG, "onNewToken: token(last 8)=...${token.takeLast(8)}")
    BrazeFirebaseMessagingService.handleOnNewToken(applicationContext, token)
    Log.d(TAG, "handleOnNewToken forwarded to Braze")
  }
}
