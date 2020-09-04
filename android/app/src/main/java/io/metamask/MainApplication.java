package io.metamask;

import com.facebook.react.ReactApplication;
import com.cmcewen.blurview.BlurViewPackage;
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

import androidx.multidex.MultiDexApplication;


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

			return packages;
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
		SoLoader.init(this, /* native exopackage */ false);

		initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
		RNBranchModule.getAutoInstance(this);

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
    		  Class<?> aClass = Class.forName("io.metamask.ReactNativeFlipper");
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
