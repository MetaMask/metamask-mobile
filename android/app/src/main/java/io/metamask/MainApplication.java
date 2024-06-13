package io.metamask;

import android.app.Application;
import com.facebook.react.ReactApplication;
import com.brentvatne.react.ReactVideoPackage;
import com.facebook.react.PackageList;
import com.airbnb.android.react.lottie.LottiePackage;

import cl.json.ShareApplication;
import io.branch.rnbranch.RNBranchModule;
import io.metamask.nativeModules.RCTMinimizerPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import java.util.List;
import io.metamask.nativeModules.PreventScreenshotPackage;
import android.webkit.WebView;

import android.database.CursorWindow;
import java.lang.reflect.Field;

import io.metamask.nativesdk.NativeSDKPackage;
import io.metamask.nativeModules.RNTar.RNTarPackage;

public class MainApplication extends Application implements ShareApplication, ReactApplication {

  @Override
  public String getFileProviderAuthority() {
    return BuildConfig.APPLICATION_ID + ".provider";
  }

	private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		@Override
		protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
			packages.add(new LottiePackage());
			packages.add(new PreventScreenshotPackage());
			packages.add(new ReactVideoPackage());
      packages.add(new RCTMinimizerPackage());
      packages.add(new NativeSDKPackage());
      packages.add(new RNTarPackage());

      return packages;
		}

    @Override
    protected boolean isNewArchEnabled() {
      return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    }
    @Override
    protected Boolean isHermesEnabled() {
      return BuildConfig.IS_HERMES_ENABLED;
    }

		@Override
		protected String getJSMainModuleName() {
			return "index";
		}
  	};

	@Override
	public ReactNativeHost getReactNativeHost() {
		return mReactNativeHost;
	}

	@Override
	public void onCreate() {
		super.onCreate();
		RNBranchModule.getAutoInstance(this);

		try {
			Field field = CursorWindow.class.getDeclaredField("sCursorWindowSize");
			field.setAccessible(true);
			field.set(null, 10 * 1024 * 1024); //the 10MB is the new size
		} catch (Exception e) {
			e.printStackTrace();
		}
		// These two lines are here to enable debugging WebView from Chrome DevTools.
		// The variables are set in the build.gradle file with values coming from the environment variables
		// `RAMP_DEV_BUILD` and `RAMP_INTERNAL_BUILD`.
		// These variables are defined at build time in Bitrise
		if (BuildConfig.DEBUG || BuildConfig.IS_RAMP_UAT.equals("true") || BuildConfig.IS_RAMP_DEV.equals("true")) {
			WebView.setWebContentsDebuggingEnabled(true);
		}

		SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
  }
}
