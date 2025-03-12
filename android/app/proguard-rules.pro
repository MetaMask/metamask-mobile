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

-dontwarn com.sun.jna.FunctionMapper
-dontwarn com.sun.jna.JNIEnv
-dontwarn com.sun.jna.LastErrorException
-dontwarn com.sun.jna.Library
-dontwarn com.sun.jna.Memory
-dontwarn com.sun.jna.Native
-dontwarn com.sun.jna.NativeLibrary
-dontwarn com.sun.jna.Platform
-dontwarn com.sun.jna.Pointer
-dontwarn com.sun.jna.Structure
-dontwarn com.sun.jna.platform.win32.Advapi32
-dontwarn com.sun.jna.platform.win32.Kernel32
-dontwarn com.sun.jna.platform.win32.Win32Exception
-dontwarn com.sun.jna.platform.win32.WinBase$OVERLAPPED
-dontwarn com.sun.jna.platform.win32.WinBase$SECURITY_ATTRIBUTES
-dontwarn com.sun.jna.platform.win32.WinDef$DWORD
-dontwarn com.sun.jna.platform.win32.WinDef$LPVOID
-dontwarn com.sun.jna.platform.win32.WinNT$ACL
-dontwarn com.sun.jna.platform.win32.WinNT$HANDLE
-dontwarn com.sun.jna.platform.win32.WinNT$SECURITY_DESCRIPTOR
-dontwarn com.sun.jna.ptr.IntByReference
-dontwarn com.sun.jna.win32.StdCallLibrary
-dontwarn com.sun.jna.win32.W32APIOptions
-dontwarn edu.umd.cs.findbugs.annotations.SuppressFBWarnings
-dontwarn java.lang.instrument.ClassDefinition
-dontwarn java.lang.instrument.ClassFileTransformer
-dontwarn java.lang.instrument.IllegalClassFormatException
-dontwarn java.lang.instrument.Instrumentation
-dontwarn java.lang.instrument.UnmodifiableClassException
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.RuntimeMXBean
-dontwarn org.mockito.internal.creation.bytebuddy.inject.MockMethodDispatcher
-dontwarn org.opentest4j.AssertionFailedError