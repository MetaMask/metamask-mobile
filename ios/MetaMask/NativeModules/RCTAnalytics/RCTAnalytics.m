//
//  RCTAnalytics.m
//  MetaMask
//
//  Created by Bruno Barbieri on 5/31/19.
//  Copyright © 2019 MetaMask. All rights reserved.
//

#import "RCTAnalytics.h"
#import <Mixpanel/Mixpanel.h>

@implementation RCTAnalytics
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(optIn:(BOOL) val) {
    if(val){
      [[Mixpanel sharedInstance] optInTracking];
    } else {
      [[Mixpanel sharedInstance] optOutTracking];
    }
}


RCT_EXPORT_METHOD(trackEvent:(NSDictionary *)event)
{
  [[Mixpanel sharedInstance] track: [self getCategory:event] properties:[self getInfo:event]];
}

- (NSString *)getCategory:(NSDictionary *)event{
  return event[@"category"];
}

- (NSDictionary *)getInfo:(NSDictionary *)event{
  NSMutableDictionary *e = [event mutableCopy];
  [e removeObjectForKey:@"category"];
  return e;
}

@end
