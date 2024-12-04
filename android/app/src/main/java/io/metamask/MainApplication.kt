package io.metamask

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import io.branch.rnbranch.RNBranchModule
import io.metamask.nativeModules.PreventScreenshotPackage
import io.metamask.nativeModules.RCTMinimizerPackage
import io.metamask.nativeModules.RNTar.RNTarPackage
import io.metamask.nativesdk.NativeSDKPackage

class MainApplication : Application(), ShareApplication, ReactApplication {

    override fun getFileProviderAuthority(): String {
        return BuildConfig.APPLICATION_ID + ".provider"
    }

    private val mReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

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

        override fun isNewArchEnabled(): Boolean {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        }

        override fun isHermesEnabled(): Boolean {
            return BuildConfig.IS_HERMES_ENABLED
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }
    }

    override fun getReactNativeHost(): ReactNativeHost {
        return mReactNativeHost
    }

    override fun registerReceiver(receiver: BroadcastReceiver, filter: IntentFilter): Intent? {
        return if (Build.VERSION.SDK_INT >= 34 && applicationInfo.targetSdkVersion >= 34) {
            super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            super.registerReceiver(receiver, filter)
        }
    }

    override fun onCreate() {
        super.onCreate()
        RNBranchModule.getAutoInstance(this)

        try {
            val field = CursorWindow::class.java.getDeclaredField("sCursorWindowSize")
            field.isAccessible = true
            field.set(null, 10 * 1024 * 1024) // the 10MB is the new size
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // These two lines are here to enable debugging WebView from Chrome DevTools.
        // The variables are set in the build.gradle file with values coming from the environment variables
        // `RAMP_DEV_BUILD` and `RAMP_INTERNAL_BUILD`.
        // These variables are defined at build time in Bitrise
        if (BuildConfig.DEBUG || BuildConfig.IS_RAMP_UAT == "true" || BuildConfig.IS_RAMP_DEV == "true") {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        SoLoader.init(this, /* native exopackage */ false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load()
        }

        ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
    }
} 