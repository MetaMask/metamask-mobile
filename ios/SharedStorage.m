//
//  SharedStorage.m
//  MetaMask
//
//  Created by Andre Pimenta on 06/11/2020.
//  Copyright © 2020 MetaMask. All rights reserved.
//

#import "SharedStorage.h"


@implementation SharedStorage

RCT_EXPORT_MODULE();

// We can send back a promise to our JavaScript environment :)
RCT_EXPORT_METHOD(set:(NSString *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  @try{
    //CHANGE THE GROUP HERE
    NSUserDefaults *shared = [[NSUserDefaults alloc]initWithSuiteName:@"group.io.metamask"];
    [shared setObject:data forKey:@"data"];
    [shared synchronize];
    resolve(@"true");
  }@catch(NSException *exception){
    reject(@"get_error",exception.reason, nil);
  }

}

@end
