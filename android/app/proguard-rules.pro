# Project-specific ProGuard/R8 rules.
#
# These are appended to the AGP default file selected in app/build.gradle. That file is
# `proguard-android-optimize.txt` — NOT `proguard-android.txt`, which ships `-dontoptimize`
# and disables R8's optimizer even when `minifyEnabled true`.
#
# Guidance when editing (from the Monzo/R8 case study):
#   Keep rules are the main thing limiting R8. Every `-keep class X.** { *; }` removes a whole
#   package from shrinking, inlining, class merging and devirtualization. Prefer, in order:
#     1. no rule at all — most AARs ship their own consumer-rules.pro; check before adding one
#     2. an annotation-driven rule (`-keep @SomeAnnotation class *`)
#     3. a narrow member rule (`-keepclassmembers`, `-keepnames`)
#     4. a broad wildcard — last resort, and only with a comment saying why
#   Verify a rule is actually needed before adding it: `-whyareyoukeeping class com.example.Foo`.
#
# Diagnostics land in app/build/outputs/mapping/<variant>/ — see the -print* directives below.

# =============================================================================
# R8 diagnostics
# =============================================================================
# configuration.txt is the MERGED ruleset: this file + every AAR's consumer-rules.pro + the AGP
# default. Grep it for `-dontoptimize` after any dependency bump — a single library shipping that
# directive silently disables the optimizer for the whole app.
#   grep -nE '^-(dontoptimize|dontshrink|dontobfuscate)' \
#     android/app/build/outputs/mapping/prodRelease/configuration.txt
#
# usage.txt lists everything R8 removed. Diffing it against a known-good build is our regression
# gate for reflectively-reached code — see scripts/android/r8-usage-gate.mjs.
-printmapping       build/outputs/mapping/mapping.txt
-printusage         build/outputs/mapping/usage.txt
-printseeds         build/outputs/mapping/seeds.txt
-printconfiguration build/outputs/mapping/configuration.txt

# =============================================================================
# Stack traces / crash symbolication
# =============================================================================
# proguard-android-optimize.txt only keeps *Annotation*. Without SourceFile+LineNumberTable,
# optimized stack traces lose line numbers in Sentry even though the mapping file is uploaded.
# -renamesourcefileattribute collapses the (now meaningless) source file name to a constant so
# the attribute costs almost nothing in DEX.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Signature is required for generic-type reflection (Gson/Moshi/Retrofit-style deserialization
# over generic or suspend functions). Under R8 full mode attributes are only retained for members
# matched by a keep rule, so Continuation needs an explicit keep alongside it.
-keepattributes Signature,InnerClasses,EnclosingMethod,Exceptions
-keep class kotlin.coroutines.Continuation

# :react-native-inappbrowser-reborn
-keepattributes *Annotation*

# =============================================================================
# React Native — bridge, TurboModules, Fabric, codegen
# =============================================================================
# The bridge resolves modules, methods and props BY NAME at runtime, so annotated entry points
# must survive renaming. These are annotation-driven rather than package wildcards: they cover
# only the reflectively-reached surface and leave the rest of RN open to the optimizer.
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.react.bridge.ReactMethod
-keep,allowobfuscation @interface com.facebook.react.module.annotations.ReactModule
-keep,allowobfuscation @interface com.facebook.react.uimanager.annotations.ReactProp
-keep,allowobfuscation @interface com.facebook.react.uimanager.annotations.ReactPropGroup

-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.common.internal.DoNotStrip class * { *; }
-keep @com.facebook.react.module.annotations.ReactModule class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# NativeModule / ViewManager / TurboModule implementations are instantiated reflectively by
# PackageList and TurboModuleManager. Keep the types and their constructors; members that are not
# @ReactMethod-annotated stay eligible for optimization.
-keep class * extends com.facebook.react.bridge.NativeModule { <init>(...); }
-keep class * implements com.facebook.react.bridge.NativeModule { <init>(...); }
-keep class * extends com.facebook.react.uimanager.ViewManager { <init>(...); }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { <init>(...); }
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }

# Codegen-generated TurboModule/component specs are referenced from generated C++ across JNI.
-keep class com.facebook.fbreact.specs.** { *; }

# Reanimated's own consumer rules cover com.swmansion.reanimated.**; this one is the RN-side
# TurboModule surface its docs additionally ask for.
-keep class com.facebook.react.turbomodule.** { *; }

# =============================================================================
# JNI
# =============================================================================
# Any class declaring a native method is looked up from C++ by name.
-keepclasseswithmembernames class * {
    native <methods>;
}

# HybridData is the JNI <-> JVM handle for every RN C++ hybrid object. The field is read from
# native code by name and must not be renamed or stripped.
-keepclassmembers class * {
    com.facebook.jni.HybridData *;
}
-keep class com.facebook.jni.** { *; }

# Hermes ICU/unicode glue is reached from native.
-keep class com.facebook.hermes.unicode.** { *; }

# =============================================================================
# WebView JavaScript interfaces (dApp browser)
# =============================================================================
# @JavascriptInterface methods are invoked by name from injected JS. Without this the dApp
# browser bridge breaks silently at runtime.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# =============================================================================
# Kotlin
# =============================================================================
# DO NOT REMOVE THIS RULE WITHOUT AN ON-DEVICE TEST. Measured 2026-08-20 on a Galaxy A14 (API 35):
#
#   optimizer ON, kotlin.** removed  -> DEX 18.31 MB, app dies on the ErrorBoundary with
#                                       "Engine does not exist". No native exception, no crash,
#                                       nothing in usage.txt that looks wrong — it just silently
#                                       fails to initialise and shows the error screen.
#   optimizer ON, kotlin.** kept     -> DEX 21.44 MB, app boots to a usable screen in ~3s.
#
# Removing it looks like the single biggest optimization unlock available (−3.1 MB of DEX), which
# is exactly why it is tempting. It is also the change that breaks the app.
#
# expo-modules-core depends on `org.jetbrains.kotlin:kotlin-reflect` and reflects over arbitrary
# Kotlin types to build its module registry and coerce argument types (see KClassExtensions.kt,
# EnumExtensions.kt, ReadableTypeExtensions.kt). Its own consumer-rules.pro is applied and is not
# sufficient on its own.
#
# A narrower rule was attempted and REJECTED — this combination still broke (DEX 19.86 MB):
#     kotlin.Metadata + kotlin.reflect.** + kotlin.jvm.internal.**
#     + kotlin.jvm.functions.** + kotlin.coroutines.** + kotlin.enums.**
#
# Recovering the remaining ~3 MB is viable future work, but it needs a real bisection (halve the
# kept package set, rebuild, boot the app on a device, repeat) rather than reasoning about which
# packages "should" be needed. Budget ~4 minutes per iteration.
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }

-dontwarn kotlinx.serialization.SerialName
-dontwarn kotlinx.serialization.Serializable

# kotlinx-coroutines: keep only the ServiceLoader-resolved factories and the volatile fields the
# atomic operations depend on. Deliberately NOT `-keep class kotlinx.coroutines.** { *; }` — that
# would defeat significant whole-program optimization.
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepnames class kotlinx.coroutines.android.AndroidExceptionPreHandler {}
-keepnames class kotlinx.coroutines.android.AndroidDispatcherFactory {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# =============================================================================
# Third-party libraries that do NOT ship adequate consumer rules
# =============================================================================
# Verified as shipping their own consumer-rules.pro / proguard.txt (so intentionally absent here):
# Braze, Expo, Reanimated, Notifee, Firebase, Play Services, OkHttp, Sentry.

# react-native-keychain — Conceal crypto is loaded over JNI.
# https://github.com/oblador/react-native-keychain#proguard-rules
-keep class com.facebook.crypto.** { *; }

# react-native-svg — https://github.com/react-native-svg/react-native-svg#problems-with-proguard
-keep public class com.horcrux.svg.** { *; }

# react-native-webrtc — https://github.com/react-native-webrtc/react-native-webrtc/issues/590
-keep class org.webrtc.** { *; }

# EventBus subscriber methods are invoked reflectively.
-keepclassmembers class ** {
  @org.greenrobot.eventbus.Subscribe <methods>;
}
-keep enum org.greenrobot.eventbus.ThreadMode { *; }

# Branch resolves session-init callbacks reflectively during deep-link handling.
-keep class io.branch.** { *; }
-dontwarn io.branch.**

# Play Install Referrer — reached ONLY by reflection, never statically.
# react-native-device-info's RNInstallReferrerClient does:
#     Class.forName("com.android.installreferrer.api.InstallReferrerClient")
#     clazz.getMethod("newBuilder", Context.class)
# so R8 sees no caller and strips newBuilder/startConnection/endConnection. Nothing crashes — the
# reflective lookup throws NoSuchMethodException, which the library swallows — but install
# attribution silently stops working.
#
# Caught by running a minified build on a physical device after enabling the optimizer. Note the
# baseline build was ALREADY broken this way — usage.txt alone was misleading, it showed only
# isReady() stripped. Verify with:
#   awk '/^com\.android\.installreferrer\.api\.InstallReferrerClient:$/{f=1;next} /^[^ \t]/{f=0} f' \
#     android/app/build/outputs/mapping/prodRelease/usage.txt
-keep class com.android.installreferrer.api.** { *; }

# =============================================================================
# App code
# =============================================================================
# MainActivity/MainApplication are kept automatically via the merged AndroidManifest. Our JS-bridge
# native modules are covered by the `extends NativeModule` rule above; this pins them by package as
# defence against a refactor dropping the inheritance.
-keep class io.metamask.nativeModules.** { *; }

# =============================================================================
# Warning suppression (no effect on optimization)
# =============================================================================
# Missing Java desktop classes referenced by JNA and friends.
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
