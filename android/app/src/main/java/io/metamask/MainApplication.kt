package io.metamask

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.database.CursorWindow
import android.os.Build
import android.webkit.WebView
import cl.json.ShareApplication
import com.airbnb.android.react.lottie.LottiePackage
import com.brentvatne.react.ReactVideoPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import io.branch.rnbranch.RNBranchModule
import io.metamask.nativeModules.PreventScreenshotPackage
import io.metamask.nativeModules.RCTMinimizerPackage
import io.metamask.nativeModules.RNTar.RNTarPackage
import io.metamask.nativesdk.NativeSDKPackage
import com.facebook.react.soloader.OpenSourceMergedSoMapping


class MainApplication : Application(), ShareApplication, ReactApplication {

    override fun getFileProviderAuthority(): String = "${BuildConfig.APPLICATION_ID}.provider"

    private val reactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override fun getPackages(): List<ReactPackage> {
                val packages = PackageList(this).packages.toMutableList()
                packages.add(LottiePackage())
                packages.add(PreventScreenshotPackage())
                packages.add(ReactVideoPackage())
                packages.add(RCTMinimizerPackage())
                packages.add(NativeSDKPackage())
                packages.add(RNTarPackage())
                return packages
            }

            override fun isNewArchEnabled(): Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

            override fun isHermesEnabled(): Boolean = BuildConfig.IS_HERMES_ENABLED

            override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
        }
    )

    override fun getReactNativeHost(): ReactNativeHost = reactNativeHost

    override fun registerReceiver(receiver: BroadcastReceiver, filter: IntentFilter): Intent? {
        return if (Build.VERSION.SDK_INT >= 34 && applicationInfo.targetSdkVersion >= 34) {
            super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            super.registerReceiver(receiver, filter)
        }
    }

    override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, OpenSourceMergedSoMapping)
        RNBranchModule.getAutoInstance(this)

        try {
            val field = CursorWindow::class.java.getDeclaredField("sCursorWindowSize")
            field.isAccessible = true
            field.set(null, 10 * 1024 * 1024) // 10MB is the new size
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Enable debugging WebView from Chrome DevTools
        if (BuildConfig.DEBUG || 
            BuildConfig.IS_RAMP_UAT == "true" || 
            BuildConfig.IS_RAMP_DEV == "true"
        ) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        SoLoader.init(this, false)
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load()
        }

        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
} 