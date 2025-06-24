#import "RCTFpsDebugModule.h"
#import <React/RCTDevSettings.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>

#if DEBUG
@interface RCTPerfMonitor : NSObject
- (void)show;
- (void)hide;
@end
#endif

@implementation RCTFpsDebugModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setFpsDebugEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"[RCTFpsDebugModule] setFpsDebugEnabled called with enabled: %@", enabled ? @"YES" : @"NO");

#if DEBUG
    dispatch_async(dispatch_get_main_queue(), ^{

        @try {
            if (!self.bridge) {
                NSLog(@"[RCTFpsDebugModule] Bridge is null");
                reject(@"BRIDGE_NULL", @"React bridge is null", nil);
                return;
            }

            RCTDevSettings *devSettings = [self.bridge moduleForClass:[RCTDevSettings class]];
            if (!devSettings) {
                NSLog(@"[RCTFpsDebugModule] devsettings is null");
                reject(@"DEV_SETTINGS_NULL", @"Dev settings module is null", nil);
                return;
            }

            id perfMonitor = [self.bridge moduleForName:@"PerfMonitor"];
            if (!perfMonitor) {
                NSLog(@"[RCTFpsDebugModule] ERROR: PerfMonitor module is null");
                reject(@"PERF_MONITOR_NULL", @"PerfMonitor module is null", nil);
                return;
            }

            if (enabled) {
                [perfMonitor show];
                devSettings.isPerfMonitorShown = YES;
                NSLog(@"[RCTFpsDebugModule] Showing performance monitor");
            } else if (!enabled) {
                [perfMonitor hide];
                devSettings.isPerfMonitorShown = NO;
                NSLog(@"[RCTFpsDebugModule] Hiding performance monitor");
            }

            resolve(@(enabled));
            return;
        } @catch (NSException *exception) {
            NSLog(@"[RCTFpsDebugModule] ERROR: Exception caught: %@", exception.reason);
            reject(@"SET_FPS_DEBUG_ERROR",
                   [NSString stringWithFormat:@"Failed to set FPS debug enabled: %@", exception.reason],
                   nil);
        }
    });
#else
    NSLog(@"[RCTFpsDebugModule] Not in debug mode");
    resolve(@(NO));
#endif
}

RCT_EXPORT_METHOD(isFpsDebugEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            if (!self.bridge) {
                reject(@"BRIDGE_NULL", @"React bridge is null", nil);
                return;
            }

            RCTDevSettings *devSettings = [self.bridge moduleForClass:[RCTDevSettings class]];
            if (!devSettings) {
                reject(@"DEV_SETTINGS_NULL", @"Dev settings module is null", nil);
                return;
            }

#if DEBUG
            BOOL isEnabled = devSettings.isPerfMonitorShown;
            resolve(@(isEnabled));
#else
            resolve(@NO);
#endif

        } @catch (NSException *exception) {
            reject(@"GET_FPS_DEBUG_ERROR",
                   [NSString stringWithFormat:@"Failed to get FPS debug enabled state: %@", exception.reason],
                   nil);
        }
    });
}

@end
