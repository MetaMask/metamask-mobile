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
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

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

    override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                val packages = PackageList(this).packages.toMutableList()
                // Add all our custom packages
                packages.add(PreventScreenshotPackage())
                packages.add(RCTMinimizerPackage())
                packages.add(RNTarPackage())
                packages.add(NotificationPackage())
                return packages
            }

            override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }
    )

    override val reactHost: ReactHost
        get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

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

        // Fire prefetchOnAppStart queue before JS loads (Android requires explicit call;
        // iOS is auto-bootstrapped via NitroBootstrap.mm +load).
        //
        // registerPrefetch() writes URLs to SharedPreferences so prefetchOnStart() fires
        // them on THIS launch — including the very first cold launch (fresh install) before
        // JS has had a chance to call prefetchOnAppStart(). Entries are deduped by key, so
        // JS-side calls overwrite these defaults with the correct runtime values on
        // subsequent launches.
        try {
            val distribution = if (BuildConfig.FLAVOR == "flask") "flask" else "main"
            if (!BuildConfig.DEBUG) {
                // Only register feature flags in release builds where
                // METAMASK_ENVIRONMENT=production is guaranteed. Debug builds may use a
                // different environment; JS will seed the correct URL after its first run.
                AutoPrefetcher.registerPrefetch(
                    this,
                    "https://client-config.api.cx.metamask.io/v1/flags" +
                        "?client=mobile&distribution=$distribution&environment=production",
                    "feature-flags",
                    emptyMap(),
                )
            }
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
            // Non-fatal: prefetch is a cold-start optimisation. If it fails (e.g. fresh
            // install, missing native queue, or early init race) the app continues normally
            // and requests are served by the standard fetch path.
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
