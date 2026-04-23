//
//  RCTAnalytics.m
//  MetaMask
//
//  Created by Bruno Barbieri on 5/31/19.
//  Copyright © 2019 MetaMask. All rights reserved.
//

#import "RCTAnalytics.h"
#import <Mixpanel/Mixpanel.h>
#import <Mixpanel/MPTweakInline.h>
#import <Mixpanel/MixpanelPeople.h>

@implementation RCTAnalytics
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(optIn:(BOOL) val) {
    // Making sure it runs on the main thread
    dispatch_async(dispatch_get_main_queue(), ^(){
      if(val){
        [[Mixpanel sharedInstance] optInTracking];
      } else {
        [[Mixpanel sharedInstance] optOutTracking];
      }
    });
}

RCT_EXPORT_METHOD(trackEvent:(NSDictionary *)event)
{
  [[Mixpanel sharedInstance] track: [self getCategory:event] properties:[self getInfo:event]];
}

RCT_EXPORT_METHOD(trackEventAnonymously:(NSDictionary *)event)
{
  NSString *const distinctId = [[Mixpanel sharedInstance] distinctId];
  [[Mixpanel sharedInstance] identify:@"0x0000000000000000"];
  [[Mixpanel sharedInstance] track: [self getCategory:event] properties:[self getInfo:event]];
  [[Mixpanel sharedInstance] identify:distinctId];
}


RCT_EXPORT_METHOD(peopleIdentify)
{
  [[Mixpanel sharedInstance] identify:[[Mixpanel sharedInstance] distinctId]];
}

RCT_EXPORT_METHOD(setUserProfileProperty:(NSString *)propertyName to:(id)propertyValue)
{
  [[Mixpanel sharedInstance] identify:[[Mixpanel sharedInstance] distinctId]];
  [[Mixpanel sharedInstance].people set:propertyName to:propertyValue];
}

RCT_REMAP_METHOD(getDistinctId,
                 getDistinctIdWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve([[Mixpanel sharedInstance] distinctId]);
}


RCT_REMAP_METHOD(getRemoteVariables,
                 getRemoteVariableWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *val = MPTweakValue(@"remoteVariables", @"{}");

  if (val) {
    resolve(val);
  } else {
    resolve(@"{}");
  }
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
