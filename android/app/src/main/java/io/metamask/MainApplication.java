package io.metamask;

import com.facebook.react.ReactApplication;
import android.content.Context;
import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import io.sentry.RNSentryPackage;
import com.sensors.RNSensorsPackage;
import com.swmansion.reanimated.ReanimatedPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import fr.greweb.reactnativeviewshot.RNViewShotPackage;
import com.airbnb.android.react.lottie.LottiePackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.ocetnik.timer.BackgroundTimerPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.horcrux.svg.SvgPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import io.branch.rnbranch.RNBranchPackage;
import io.branch.rnbranch.RNBranchModule;
import io.metamask.nativeModules.RCTAnalyticsPackage;
import io.metamask.nativeModules.PreventScreenshotPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import cl.json.RNSharePackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.peel.react.rnos.RNOSModule;
import com.oblador.keychain.KeychainPackage;
import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
import com.rnfs.RNFSPackage;
import org.reactnative.camera.RNCameraPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import cl.json.ShareApplication;
import java.lang.reflect.InvocationTargetException;
import java.util.List;

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
				packages.add(new MainReactPackage());
				packages.add(new RNSentryPackage());
				packages.add(new RNSensorsPackage());
				packages.add(new ReanimatedPackage());
				packages.add(new RNCWebViewPackage());
				packages.add(new NetInfoPackage());
				packages.add(new RNViewShotPackage());
				packages.add(new LottiePackage());
				packages.add(new AsyncStoragePackage());
				packages.add(new ReactNativePushNotificationPackage());
				packages.add(new BackgroundTimerPackage());
				packages.add(new RNDeviceInfo());
				packages.add(new SvgPackage());
				packages.add(new RNGestureHandlerPackage());
				packages.add(new RNScreensPackage());
				packages.add(new RNBranchPackage());
				packages.add(new KeychainPackage());
				packages.add(new RandomBytesPackage());
				packages.add(new RCTAesPackage());
				packages.add(new RNCameraPackage());
				packages.add(new RNFSPackage());
				packages.add(new RNI18nPackage());
				packages.add(new RNOSModule());
				packages.add(new RNSharePackage());
				packages.add(new VectorIconsPackage());
				packages.add(new RCTAnalyticsPackage());

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

		RNBranchModule.getAutoInstance(this);
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

	@Override
	public String getFileProviderAuthority() {
		return BuildConfig.APPLICATION_ID + ".provider";
	}
}
