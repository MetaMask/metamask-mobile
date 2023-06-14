//
//  RCTMinimizer.m
//  MetaMask
//
//  Created by Tomás Almeida dos Santos on 14/06/2023.
//  Copyright © 2023 MetaMask. All rights reserved.
//

#import <Foundation/Foundation.h>
//
//  RCTMinimizerModule.m
//  MetaMask
//
//  Created by Tomás Almeida dos Santos on 14/06/2023.
//  Copyright © 2023 MetaMask. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RCTMinimizer.h"

@import UIKit;
@import ObjectiveC.runtime;

@interface UISystemNavigationAction : NSObject
@property(nonatomic, readonly, nonnull) NSArray<NSNumber*>* destinations;
-(BOOL)sendResponseForDestination:(NSUInteger)destination;
@end


@implementation Minimizer

RCT_EXPORT_METHOD(goBack)
{
  Ivar sysNavIvar = class_getInstanceVariable(UIApplication.class, "_systemNavigationAction");
  UIApplication* app = UIApplication.sharedApplication;
  UISystemNavigationAction* action = object_getIvar(app, sysNavIvar);
  if (!action) {
      return;
  }
  NSUInteger destination = action.destinations.firstObject.unsignedIntegerValue;
  [action sendResponseForDestination:destination];
  return;
}

+ (NSString *)moduleName {
  return @"Minimizer";
}

@end
