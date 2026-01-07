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
        if (BuildConfig.DEBUG || BuildConfig.IS_RAMP_UAT == "true" || BuildConfig.IS_RAMP_DEV == "true") {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        // Initialize SoLoader
        SoLoader.init(this, OpenSourceMergedSoMapping)
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }

        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
} 