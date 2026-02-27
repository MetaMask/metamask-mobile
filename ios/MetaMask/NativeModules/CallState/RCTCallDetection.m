#import <Foundation/Foundation.h>
#import <CallKit/CallKit.h>
#import "RCTCallDetection.h"

@interface RCTCallDetection () <CXCallObserverDelegate>

@property (nonatomic, strong) CXCallObserver *callObserver;
@property (nonatomic, assign) BOOL isOnCall;

@end

@implementation RCTCallDetection

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        _callObserver = [[CXCallObserver alloc] init];
        _isOnCall = NO;
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onCallStateChanged"];
}

- (void)startObserving {
    [self.callObserver setDelegate:self queue:nil];
    // Check initial state
    [self updateCallState];
}

- (void)stopObserving {
    [self.callObserver setDelegate:nil queue:nil];
}

- (void)updateCallState {
    BOOL hasActiveCalls = NO;
    for (CXCall *call in self.callObserver.calls) {
        if (!call.hasEnded) {
            hasActiveCalls = YES;
            break;
        }
    }
    self.isOnCall = hasActiveCalls;
}

#pragma mark - CXCallObserverDelegate

- (void)callObserver:(CXCallObserver *)callObserver callChanged:(CXCall *)call {
    BOOL hasActiveCalls = NO;
    for (CXCall *activeCall in callObserver.calls) {
        if (!activeCall.hasEnded) {
            hasActiveCalls = YES;
            break;
        }
    }
    self.isOnCall = hasActiveCalls;
    [self sendEventWithName:@"onCallStateChanged"
                       body:@{@"isOnCall": @(hasActiveCalls)}];
}

#pragma mark - Exported Methods

RCT_EXPORT_METHOD(checkCallState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self updateCallState];
    resolve(@(self.isOnCall));
}

#ifdef DEBUG
RCT_EXPORT_METHOD(simulateCall:(BOOL)isOnCall) {
    self.isOnCall = isOnCall;
    [self sendEventWithName:@"onCallStateChanged"
                       body:@{@"isOnCall": @(isOnCall)}];
}
#endif

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

@end
