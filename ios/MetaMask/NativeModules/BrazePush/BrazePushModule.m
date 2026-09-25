#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <BrazeKit/BrazeKit-Swift.h>
#import <React/RCTBridgeModule.h>
#import "MetaMask-Swift.h"

@interface BrazePushModule : NSObject <RCTBridgeModule>
@end

static const int64_t kApnsTokenWaitSeconds = 15;
static const int kSdkTokenPollAttempts = 20;
static BOOL sUnregisterInFlight = NO;
static RCTPromiseResolveBlock sPendingUnregisterResolve = nil;

static void BrazePushResolveUnregister(RCTPromiseResolveBlock resolve, BOOL success, NSString *message) {
  sUnregisterInFlight = NO;
  if (success) {
    AppDelegate.brazeHasPushTokenInProcess = NO;
    resolve(@{@"success": @YES});
    return;
  }

  resolve(@{
    @"success": @NO,
    @"message": message ?: @"Failed to unregister Braze push",
  });
}

static void BrazePushUnregisterOnly(Braze *braze, RCTPromiseResolveBlock resolve) {
  [braze.notifications unregisterPushWithCompletion:^(NSError *error) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (error == nil) {
        BrazePushResolveUnregister(resolve, YES, nil);
        return;
      }

      // A rate-limited failure drops the in-memory token. The next attempt
      // must load it again instead of calling unregister on an empty SDK.
      AppDelegate.brazeHasPushTokenInProcess = NO;
      BrazePushResolveUnregister(resolve, NO, error.localizedDescription);
    });
  }];
}

static void BrazePushUnregisterWhenSdkHasToken(Braze *braze, RCTPromiseResolveBlock resolve, int remainingAttempts);

/**
 * `registerDeviceToken:` stores the token asynchronously. Calling
 * `unregisterPush` in the same turn reads an empty SDK and returns
 * `noPushToken` without sending `/push/unregister`, while the register
 * request still goes out.
 */
static void BrazePushUnregisterWhenSdkHasToken(Braze *braze, RCTPromiseResolveBlock resolve, int remainingAttempts) {
  if (braze.notifications.deviceToken.length > 0) {
    dispatch_async(dispatch_get_main_queue(), ^{
      BrazePushUnregisterOnly(braze, resolve);
    });
    return;
  }

  if (remainingAttempts <= 0) {
    BrazePushUnregisterOnly(braze, resolve);
    return;
  }

  // registerDeviceToken: updates the SDK token off this call stack.
  dispatch_after(
    dispatch_time(DISPATCH_TIME_NOW, 50 * NSEC_PER_MSEC),
    dispatch_get_main_queue(),
    ^{
      BrazePushUnregisterWhenSdkHasToken(braze, resolve, remainingAttempts - 1);
    }
  );
}

/**
 * Loads the APNs token into this process, then unregisters once the SDK
 * exposes it. `brazePushRegistrationRequested` stays false, so a later token
 * callback cannot opt the device back in.
 */
static void BrazePushRegisterThenUnregister(NSData *deviceToken, RCTPromiseResolveBlock resolve) {
  Braze *braze = AppDelegate.braze;
  if (braze == nil || deviceToken.length == 0) {
    BrazePushResolveUnregister(resolve, NO, @"APNs token is unavailable");
    return;
  }

  if (braze.notifications.deviceToken.length == 0) {
    [braze.notifications registerDeviceToken:deviceToken];
  }
  BrazePushUnregisterWhenSdkHasToken(braze, resolve, kSdkTokenPollAttempts);
}

void BrazePushHandleApnsDeviceToken(NSData *deviceToken) {
  RCTPromiseResolveBlock resolve = sPendingUnregisterResolve;
  if (resolve == nil) {
    return;
  }

  sPendingUnregisterResolve = nil;
  BrazePushRegisterThenUnregister(deviceToken, resolve);
}

void BrazePushHandleApnsRegistrationFailure(NSString *message) {
  RCTPromiseResolveBlock resolve = sPendingUnregisterResolve;
  if (resolve == nil) {
    return;
  }

  sPendingUnregisterResolve = nil;
  BrazePushResolveUnregister(resolve, NO, message);
}

@implementation BrazePushModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_REMAP_METHOD(
  registerPush,
  registerPushWithResolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
) {
  Braze *braze = AppDelegate.braze;
  if (braze == nil) {
    reject(@"SDK_UNAVAILABLE", @"Braze is not initialized", nil);
    return;
  }

  AppDelegate.brazePushRegistrationRequested = YES;
  NSData *deviceToken = AppDelegate.apnsDeviceToken;
  if (deviceToken == nil) {
    // APNs token delivery is asynchronous. AppDelegate completes registration
    // when didRegisterForRemoteNotifications receives the token.
    resolve(nil);
    return;
  }

  [braze.notifications registerDeviceToken:deviceToken];
  AppDelegate.brazeHasPushTokenInProcess = YES;
  resolve(nil);
}

RCT_REMAP_METHOD(
  unregisterPush,
  unregisterPushWithResolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
) {
  RCTPromiseResolveBlock resolveCopy = [resolve copy];
  RCTPromiseRejectBlock rejectCopy = [reject copy];

  dispatch_async(dispatch_get_main_queue(), ^{
    AppDelegate.brazePushRegistrationRequested = NO;

    Braze *braze = AppDelegate.braze;
    if (braze == nil) {
      rejectCopy(@"SDK_UNAVAILABLE", @"Braze is not initialized", nil);
      return;
    }

    if (sUnregisterInFlight) {
      resolveCopy(@{
        @"success": @NO,
        @"message": @"Braze push unregistration already in progress",
      });
      return;
    }

    sUnregisterInFlight = YES;

    // This process already handed Braze the token. Unregister it directly so
    // a second register request cannot land after a successful removal.
    if (AppDelegate.brazeHasPushTokenInProcess) {
      BrazePushUnregisterOnly(braze, resolveCopy);
      return;
    }

    NSData *deviceToken = AppDelegate.apnsDeviceToken;
    if (deviceToken.length > 0) {
      BrazePushRegisterThenUnregister(deviceToken, resolveCopy);
      return;
    }

    // Cold start: the Swift SDK does not keep the APNs token. Ask iOS for it
    // and unregister from didRegister, still in this process.
    sPendingUnregisterResolve = resolveCopy;
    [[UIApplication sharedApplication] registerForRemoteNotifications];
    dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, kApnsTokenWaitSeconds * NSEC_PER_SEC),
      dispatch_get_main_queue(),
      ^{
        RCTPromiseResolveBlock timedOut = sPendingUnregisterResolve;
        if (timedOut == nil) {
          return;
        }
        sPendingUnregisterResolve = nil;
        BrazePushResolveUnregister(
          timedOut,
          NO,
          @"Timed out waiting for the APNs device token"
        );
      }
    );
  });
}

@end
