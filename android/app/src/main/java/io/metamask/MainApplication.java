package io.metamask;

import com.facebook.react.ReactApplication;
import com.cmcewen.blurview.BlurViewPackage;
import com.brentvatne.react.ReactVideoPackage;
import android.content.Context;
import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import com.airbnb.android.react.lottie.LottiePackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import io.branch.rnbranch.RNBranchModule;
import io.metamask.nativeModules.RCTAnalyticsPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import cl.json.ShareApplication;
import java.lang.reflect.InvocationTargetException;
import java.util.List;
import io.metamask.nativeModules.PreventScreenshotPackage;
import android.webkit.WebView;

import androidx.multidex.MultiDexApplication;

import android.database.CursorWindow;
import java.lang.reflect.Field;
import com.facebook.react.bridge.JSIModulePackage;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;

public class MainApplication extends MultiDexApplication implements ShareApplication, ReactApplication {

	private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		@Override
		protected List<ReactPackage> getPackages() {
			@SuppressWarnings("UnnecessaryLocalVariable")
			List<ReactPackage> packages = new PackageList(this).getPackages();
			packages.add(new LottiePackage());
			packages.add(new RNGestureHandlerPackage());
			packages.add(new RCTAnalyticsPackage());
			packages.add(new PreventScreenshotPackage());
			packages.add(new ReactVideoPackage());

			return packages;
		}

		@Override
		protected String getJSMainModuleName() {
			return "index";
		}

		@Override
		protected JSIModulePackage getJSIModulePackage() {
			return new ReanimatedJSIModulePackage();
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

		if (BuildConfig.DEBUG) {
			WebView.setWebContentsDebuggingEnabled(true);
		}

		SoLoader.init(this, /* native exopackage */ false);
		initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }

	/**
   * Loads Flipper in React Native templates. Call this in the onCreate method with something like
   * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
   *
   * @param context
   * @param reactInstanceManager
   */
  private static void initializeFlipper(
      Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.flipper.ReactNativeFlipper");
        aClass
            .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
            .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }


	@Override
	public String getFileProviderAuthority() {
		return BuildConfig.APPLICATION_ID + ".provider";
	}
}
