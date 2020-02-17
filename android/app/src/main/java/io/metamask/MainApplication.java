package io.metamask;

import com.facebook.react.ReactApplication;
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
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import cl.json.ShareApplication;
import java.util.Arrays;
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
			return Arrays.<ReactPackage>asList(
				new MainReactPackage(),
				new RNSentryPackage(),
				new RNSensorsPackage(),
				new ReanimatedPackage(),
				new RNCWebViewPackage(),
				new NetInfoPackage(),
				new RNViewShotPackage(),
				new LottiePackage(),
				new AsyncStoragePackage(),
				new ReactNativePushNotificationPackage(),
				new BackgroundTimerPackage(),
				new RNDeviceInfo(),
				new SvgPackage(),
				new RNGestureHandlerPackage(),
				new RNScreensPackage(),
				new RNBranchPackage(),
				new KeychainPackage(),
				new RandomBytesPackage(),
				new RCTAesPackage(),
				new RNCameraPackage(),
				new RNFSPackage(),
				new RNI18nPackage(),
				new RNOSModule(),
				new RNSharePackage(),
				new VectorIconsPackage(),
				new RCTAnalyticsPackage()
			);
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
	}

	@Override
	public String getFileProviderAuthority() {
		return BuildConfig.APPLICATION_ID + ".provider";
	}
}
