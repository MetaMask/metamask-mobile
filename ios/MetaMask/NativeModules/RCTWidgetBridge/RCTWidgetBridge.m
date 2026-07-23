//
//  RCTWidgetBridge.m
//  MetaMask
//
//  Registers the Swift RCTWidgetBridge module with React Native. Mirrors RNTar.m.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(RCTWidgetBridge, NSObject)
RCT_EXTERN_METHOD(getLogosDirectoryPath:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setTokens:(nonnull NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
