package com.metamask;

import android.app.Application;

import com.crashlytics.android.Crashlytics;
import com.facebook.react.ReactApplication;
import org.reactnative.camera.RNCameraPackage;
import cl.json.RNSharePackage;
import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
import com.smixx.fabric.FabricPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.oblador.keychain.KeychainPackage;
import com.peel.react.rnos.RNOSModule;
import com.BV.LinearGradient.LinearGradientPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.metamask.CustomWebview.CustomWebviewPackage;
import com.rnfs.RNFSPackage;
import com.oblador.vectoricons.VectorIconsPackage;
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
            new RNCameraPackage(),
            new RNSharePackage(),
            new RNI18nPackage(),
            new FabricPackage(),
            new RCTAesPackage(),
            new KeychainPackage(),
            new RNOSModule(),
            new LinearGradientPackage(),
            new RandomBytesPackage(),
            new RNFSPackage(),
            new VectorIconsPackage(),
            new CustomWebviewPackage()
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
    Fabric.with(this, new Crashlytics());
    SoLoader.init(this, /* native exopackage */ false);
  }
}
