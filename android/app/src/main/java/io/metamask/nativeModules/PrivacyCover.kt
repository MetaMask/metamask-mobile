package io.metamask.nativeModules

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.Promise
import io.metamask.R

/**
 * The Android privacy cover. [io.metamask.MainActivity] shows it from `onPause`
 * and [PrivacyCoverModule] hides it once resume routing resolves.
 *
 * Theme fill plus the centered splash fox, matching the iOS cover. Recents stays
 * a blank card: Android 13+ uses `setRecentsScreenshotEnabled`, older versions
 * hold FLAG_SECURE from login until logout. The snapshot is taken before
 * `onPause`, so this view is what the user sees on the way back in.
 */
internal object PrivacyCover {
    private var overlay: View? = null
    /** Bumped on every pause so a stale resume cannot start authentication. */
    private var authenticationEpoch = 0
    /** Set to [authenticationEpoch] only while `onPostResume` is the latest lifecycle event. */
    private var resumedEpoch: Int? = null
    private val authenticationWaiters = mutableListOf<Pair<Int, Promise>>()

    fun show(activity: Activity) {
        val decor = activity.window.decorView as? ViewGroup ?: return
        val existing = overlay
        val cover = if (existing != null && existing.context === activity) {
            existing
        } else {
            View(activity).apply {
                setBackgroundResource(R.drawable.app_background)
                isClickable = true
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
            }.also { overlay = it }
        }

        if (cover.parent !== decor) {
            (cover.parent as? ViewGroup)?.removeView(cover)
            decor.addView(
                cover,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )
        }
        cover.bringToFront()
        cover.visibility = View.VISIBLE
    }

    fun hide() {
        // A dismiss queued while the activity is pausing belongs to a resume
        // that is no longer current. Dropping it here keeps the cover up.
        if (resumedEpoch == null) {
            return
        }
        overlay?.visibility = View.GONE
    }

    /**
     * Authentication may start. Resolves waiters for this resume only.
     * Call from [android.app.Activity.onPostResume].
     */
    fun markAuthenticationReady() {
        resumedEpoch = authenticationEpoch
        val ready = authenticationWaiters.filter { it.first == authenticationEpoch }
        authenticationWaiters.removeAll { it.first == authenticationEpoch }
        ready.forEach { it.second.resolve(null) }
    }

    /**
     * Invalidates the current resume. Pending authentication waits fail and
     * must be requested again after the next [markAuthenticationReady].
     * Call from [android.app.Activity.onPause] before `super.onPause()`.
     */
    fun markAuthenticationUnavailable() {
        resumedEpoch = null
        authenticationEpoch += 1
        val waiting = authenticationWaiters.toList()
        authenticationWaiters.clear()
        waiting.forEach { (_, promise) ->
            promise.reject(
                "ACTIVITY_PAUSED",
                "The activity paused before authentication could start",
            )
        }
    }

    fun waitUntilAuthenticationReady(promise: Promise) {
        if (resumedEpoch == authenticationEpoch) {
            promise.resolve(null)
            return
        }
        authenticationWaiters.add(authenticationEpoch to promise)
    }
}
