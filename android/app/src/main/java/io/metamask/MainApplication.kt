package io.metamask

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.os.Build
import android.webkit.WebView
import android.database.CursorWindow

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory.getDefaultReactHost

import cl.json.ShareApplication
import io.branch.rnbranch.RNBranchModule
import io.metamask.nativeModules.PreventScreenshotPackage
import io.metamask.nativeModules.RCTMinimizerPackage
import io.metamask.nativeModules.RNTar.RNTarPackage
import io.metamask.nativeModules.NotificationPackage
import com.braze.BrazeActivityLifecycleCallbackListener
import com.margelo.nitro.nitrofetch.AutoPrefetcher

class MainApplication : Application(), ShareApplication, ReactApplication {

    override fun getFileProviderAuthority(): String = "${BuildConfig.APPLICATION_ID}.provider"

    // Expo SDK 55 removed `ReactNativeHostWrapper`; the New Architecture entry point
    // is now `ExpoReactHostFactory.getDefaultReactHost`, which wires in Expo modules'
    // host handlers (dev launcher, updates, etc.). `reactNativeHost` is intentionally
    // not overridden — it's deprecated in RN 0.83 and throws by default in the New
    // Architecture. `jsMainModulePath` defaults to ".expo/.virtual-metro-entry" and
    // the JS engine is Hermes, matching the previous configuration.
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            applicationContext,
            packageList = PackageList(this).packages.apply {
                // Add all our custom packages
                add(PreventScreenshotPackage())
                add(RCTMinimizerPackage())
                add(RNTarPackage())
                add(NotificationPackage())
            },
        )
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun registerReceiver(receiver: BroadcastReceiver?, filter: IntentFilter): Intent? {
        return if (Build.VERSION.SDK_INT >= 34 && applicationInfo.targetSdkVersion >= 34) {
            super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            super.registerReceiver(receiver, filter)
        }
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize Branch
        RNBranchModule.getAutoInstance(this)

        // Increase cursor window size
        try {
            val field = CursorWindow::class.java.getDeclaredField("sCursorWindowSize")
            field.isAccessible = true
            field.set(null, 10 * 1024 * 1024) // 10MB is the new size
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Enable debugging WebView from Chrome DevTools
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        try {
            AutoPrefetcher.registerPrefetch(
                this,
                "https://phishing-detection.api.cx.metamask.io/v1/stalelist",
                "phishing-stalelist",
                emptyMap(),
            )
            AutoPrefetcher.registerPrefetch(
                this,
                "https://client-side-detection.api.cx.metamask.io/v1/request-blocklist",
                "phishing-c2-blocklist",
                emptyMap(),
            )
            AutoPrefetcher.prefetchOnStart(this)
        } catch (_: Throwable) {
            // Non-fatal: if prefetch fails the app continues on the standard fetch path.
        }

        loadReactNative(this)

        registerActivityLifecycleCallbacks(BrazeActivityLifecycleCallbackListener())
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
