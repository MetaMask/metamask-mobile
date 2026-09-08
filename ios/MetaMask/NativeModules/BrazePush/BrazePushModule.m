#import <Foundation/Foundation.h>
#import <BrazeKit/BrazeKit-Swift.h>
#import <React/RCTBridgeModule.h>
#import "MetaMask-Swift.h"

@interface BrazePushModule : NSObject <RCTBridgeModule>
@end

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

  NSData *deviceToken = AppDelegate.apnsDeviceToken;
  if (deviceToken == nil) {
    reject(@"NO_APNS_TOKEN", @"APNs device token is not available", nil);
    return;
  }

  [braze.notifications registerDeviceToken:deviceToken];
  resolve(nil);
}

RCT_REMAP_METHOD(
  unregisterPush,
  unregisterPushWithResolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
) {
  Braze *braze = AppDelegate.braze;
  if (braze == nil) {
    reject(@"SDK_UNAVAILABLE", @"Braze is not initialized", nil);
    return;
  }

  [braze.notifications unregisterPushWithCompletion:^(NSError *error) {
    if (error == nil ||
        [error.localizedDescription rangeOfString:@"no push token"
                                           options:NSCaseInsensitiveSearch].location != NSNotFound) {
      resolve(@{@"success": @YES});
      return;
    }

    NSNumber *isRetriable =
      error.userInfo[BRZPushUnregistrationErrorUserInfoKey.isRetriable] ?: @NO;
    NSNumber *httpStatusCode =
      error.userInfo[BRZPushUnregistrationErrorUserInfoKey.httpStatusCode];
    NSMutableDictionary *result = [@{
      @"success": @NO,
      @"message": error.localizedDescription,
      @"isRetriable": isRetriable
    } mutableCopy];
    if (httpStatusCode != nil) {
      result[@"httpStatusCode"] = httpStatusCode;
    }
    resolve(result);
  }];
}

@end
