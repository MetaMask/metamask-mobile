package io.metamask.braze

import android.content.Context
import android.util.AttributeSet
import androidx.core.view.WindowInsetsCompat
import com.braze.ui.inappmessage.listeners.IWebViewClientStateListener
import com.braze.ui.inappmessage.views.InAppMessageHtmlView
import com.braze.ui.support.getMaxSafeBottomInset
import com.braze.ui.support.getMaxSafeLeftInset
import com.braze.ui.support.getMaxSafeRightInset
import com.braze.ui.support.getMaxSafeTopInset

/**
 * Custom code HTML in-app message view that re-injects `--braze-safe-area-inset-*` in CSS pixels.
 *
 * Braze (as of 43.1.1) injects these values in physical pixels, which makes them
 * `devicePixelRatio` times too large inside the WebView
 * (https://github.com/braze-inc/braze-android-sdk/issues/121). Each override runs right after
 * Braze's own injection, so the corrected values win. The re-dispatched
 * `brazeSafeAreaInsetsChanged` event carries `unit: 'css'` so templates that correct the raw
 * values themselves can skip it.
 *
 * Inflated through the app's override of the `com_braze_inappmessage_html` layout.
 * Remove once Braze injects density-independent values.
 */
class DensityAwareHtmlView(context: Context, attrs: AttributeSet?) :
    InAppMessageHtmlView(context, attrs) {

    private var windowInsets: WindowInsetsCompat? = null

    override fun applyWindowInsets(insets: WindowInsetsCompat) {
        super.applyWindowInsets(insets)
        windowInsets = insets
        injectDensityIndependentInsets()
    }

    override fun setHtmlPageFinishedListener(listener: IWebViewClientStateListener?) {
        super.setHtmlPageFinishedListener(
            listener?.let {
                object : IWebViewClientStateListener {
                    override fun onPageFinished() {
                        injectDensityIndependentInsets()
                        it.onPageFinished()
                    }
                }
            },
        )
    }

    private fun injectDensityIndependentInsets() {
        val insets = windowInsets ?: return
        val webView = messageWebView ?: return
        val density = resources.displayMetrics.density
        val top = getMaxSafeTopInset(insets) / density
        val right = getMaxSafeRightInset(insets) / density
        val bottom = getMaxSafeBottomInset(insets) / density
        val left = getMaxSafeLeftInset(insets) / density

        webView.evaluateJavascript(
            """
            (function() {
              var root = document.documentElement;
              root.style.setProperty('--braze-safe-area-inset-top', '${top}px');
              root.style.setProperty('--braze-safe-area-inset-right', '${right}px');
              root.style.setProperty('--braze-safe-area-inset-bottom', '${bottom}px');
              root.style.setProperty('--braze-safe-area-inset-left', '${left}px');
              root.dispatchEvent(new CustomEvent('brazeSafeAreaInsetsChanged', {
                detail: { top: $top, right: $right, bottom: $bottom, left: $left, unit: 'css' }
              }));
            })();
            """.trimIndent(),
            null,
        )
    }
}
