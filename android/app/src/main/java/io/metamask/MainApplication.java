package io.metamask;

import android.app.Application;

import com.crashlytics.android.Crashlytics;
import com.facebook.react.ReactApplication;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.horcrux.svg.SvgPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.clipsub.RNShake.RNShakeEventPackage;
import io.branch.rnbranch.RNBranchPackage;
import io.branch.referral.Branch;
import com.web3webview.Web3WebviewPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import cl.json.RNSharePackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.peel.react.rnos.RNOSModule;
import com.BV.LinearGradient.LinearGradientPackage;
import com.oblador.keychain.KeychainPackage;
import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
import com.rnfs.RNFSPackage;
import com.smixx.fabric.FabricPackage;
import org.reactnative.camera.RNCameraPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import io.fabric.sdk.android.Fabric;
import java.util.Arrays;
import java.util.List;

import android.support.multidex.MultiDexApplication;


public class MainApplication extends MultiDexApplication implements ReactApplication {

	private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		@Override
		protected List<ReactPackage> getPackages() {
		return Arrays.<ReactPackage>asList(
				new MainReactPackage(),
				new RNDeviceInfo(),
				new SvgPackage(),
				new RNGestureHandlerPackage(),
				new RNScreensPackage(),
            	new RNShakeEventPackage(),
				new RNBranchPackage(),
				new FabricPackage(),
				new KeychainPackage(),
				new LinearGradientPackage(),
				new RandomBytesPackage(),
				new RCTAesPackage(),
				new RNCameraPackage(),
				new RNFSPackage(),
				new RNI18nPackage(),
				new RNOSModule(),
				new RNSharePackage(),
				new VectorIconsPackage(),
				new Web3WebviewPackage()
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
		if (!BuildConfig.DEBUG){
			Fabric.with(this, new Crashlytics());
			Branch.getAutoInstance(this);
		}
		SoLoader.init(this, /* native exopackage */ false);
	}
}
