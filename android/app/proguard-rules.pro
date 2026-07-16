# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}
-dontwarn io.branch.**


# react native keychain https://github.com/oblador/react-native-keychain#proguard-rules
-keep class com.facebook.crypto.** {
   *;
}

# react-native-svg https://github.com/react-native-svg/react-native-svg#problems-with-proguard
-keep public class com.horcrux.svg.** {*;}

# react-native-reanimated https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation
-keep class com.facebook.react.turbomodule.** { *; }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }#

# react-native-webrt https://github.com/react-native-webrtc/react-native-webrtc/issues/590
-keep class org.webrtc.** { *; }

# :react-native-inappbrowser-reborn
-keepattributes *Annotation*
-keepclassmembers class ** {
  @org.greenrobot.eventbus.Subscribe <methods>;
}
-keep enum org.greenrobot.eventbus.ThreadMode { *; }

# kotlin

  -keep class kotlin.** { *; }

  -keep class kotlin.Metadata { *; }

-dontwarn kotlinx.serialization.SerialName
-dontwarn kotlinx.serialization.Serializable


# Ignore missing Java desktop classes referenced by JNA
-dontwarn java.awt.**
-dontwarn javax.swing.**
-dontwarn java.lang.instrument.**
-dontwarn sun.misc.**
-dontwarn edu.umd.cs.findbugs.**
-dontwarn com.huawei.hms.ads.**
-dontwarn com.google.common.util.concurrent.**
-dontwarn org.objectweb.asm.**
-dontwarn net.bytebuddy.**


-dontwarn com.facebook.react.bridge.JavaOnlyMap$Companion

# Braze owns the sole declared FirebaseMessagingService (see AndroidManifest.xml) and forwards
# non-Braze FCM messages to RNFB by reflectively loading the classpath string configured in
# braze.xml (com_braze_fallback_firebase_cloud_messaging_service_classpath). There is no
# compile-time reference to this class, so without this rule R8 renames/strips it in release
# builds and Braze's Class.forName() lookup silently fails, dropping all foreground push
# notifications that aren't Braze's own (background/killed still works because the OS displays
# `notification`-payload pushes directly, without invoking this service at all).
-keep class io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService { *; }
