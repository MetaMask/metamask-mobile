#import <React/RCTBridgeModule.h>
#import "MetaMask-Swift.h"

@interface PrivacyCoverModule : NSObject <RCTBridgeModule>
@end

@implementation PrivacyCoverModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(hide)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[PrivacyCover shared] hide];
  });
}

@end
