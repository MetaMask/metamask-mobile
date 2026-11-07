package io.metamask

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.braze.enums.Channel
import com.braze.ui.BrazeDeeplinkHandler
import com.braze.ui.actions.UriAction
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import io.branch.rnbranch.RNBranchModule

/**
 * Delivers in-app message CTAs for MetaMask deeplinks without starting an
 * Activity.
 *
 * Braze's default handler starts a VIEW intent. The target is the already
 * foregrounded singleTask [MainActivity], so it pauses and resumes, which
 * shows the privacy cover before navigation. This does what
 * [MainActivity.onNewIntent] does for that intent instead: React Native
 * Linking receives the URL, and Branch links also start a Branch session so
 * Branch can resolve and attribute them. `metamask://` links skip Branch; they
 * carry no Branch link data.
 *
 * Other channels, other URLs, and taps before React Native and Branch are
 * running keep the default behavior.
 */
class MetaMaskBrazeDeeplinkHandler(
    private val currentReactContext: () -> ReactContext?,
) : BrazeDeeplinkHandler() {

    override fun gotoUri(context: Context, uriAction: UriAction) {
        if (uriAction.channel == Channel.INAPP_MESSAGE && deliverWithoutActivity(uriAction.uri)) {
            return
        }
        super.gotoUri(context, uriAction)
    }

    private fun deliverWithoutActivity(uri: Uri): Boolean {
        val isMetaMaskScheme = uri.scheme.equals("metamask", ignoreCase = true)
        val isBranchLink = uri.scheme.equals("https", ignoreCase = true) &&
            uri.host?.lowercase() in BRANCH_LINK_HOSTS
        if (!isMetaMaskScheme && !isBranchLink) {
            return false
        }

        val reactContext = currentReactContext()
            ?.takeIf { it.hasActiveReactInstance() }
            ?: return false
        // RNBranchModule reinitializes against the Activity it saw in
        // MainActivity.onStart.
        if (reactContext.currentActivity !is MainActivity) {
            return false
        }
        val deviceEventManager =
            reactContext.getNativeModule(DeviceEventManagerModule::class.java)
                ?: return false

        deviceEventManager.emitNewIntentReceived(uri)
        if (isBranchLink) {
            RNBranchModule.onNewIntent(
                Intent(Intent.ACTION_VIEW, uri)
                    .putExtra("branch_force_new_session", true),
            )
        }
        return true
    }

    private companion object {
        /** Hosts served by Branch and claimed as App Links in AndroidManifest.xml. */
        val BRANCH_LINK_HOSTS = setOf(
            "metamask.app.link",
            "metamask-alternate.app.link",
            "metamask.test-app.link",
            "metamask-alternate.test-app.link",
            "link.metamask.io",
            "link-test.metamask.io",
            "link.metamask.com",
            "link-test.metamask.com",
        )
    }
}
