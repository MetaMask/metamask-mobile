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
      resolve(nil);
      return;
    }

    reject(@"UNREGISTER_FAILED", error.localizedDescription, error);
  }];
}

@end
