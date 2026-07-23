//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <NitroFetch/NitroAutoPrefetcher.h>

// Firebase Messaging — exposes FIRMessaging to Swift (see AppDelegate.swift willPresent).
#import <FirebaseMessaging/FirebaseMessaging.h>

// Notifee UNUserNotificationCenter singleton — used in AppDelegate.swift didReceive to
// forward taps on Notifee-created notifications so onForegroundEvent(PRESS) fires in JS.
#import <RNNotifee/NotifeeCore+UNUserNotificationCenter.h>

// Thin C wrappers around BrazeReactBridge / BrazeReactUtils.
// Implemented in BrazeHelper.mm.
// Uses id (AnyObject in Swift) to avoid importing BrazeKit-Swift.h here,
// which would create type-identity conflicts with `import BrazeKit` in Swift.
id _Nonnull BrazeHelperInit(id _Nonnull configuration);
void BrazeHelperPopulateInitialPayload(NSDictionary * _Nullable launchOptions);
