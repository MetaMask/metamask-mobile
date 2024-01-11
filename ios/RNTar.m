//
//  RNTar.m
//  MetaMask
//
//  Created by Owen Craston on 2023-11-29.
//  Copyright © 2023 MetaMask. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(RNTar, NSObject)
RCT_EXTERN_METHOD(unTar:(nonnull NSString *)pathToRead
                  pathToWrite:(nonnull NSString *)pathToWrite
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
