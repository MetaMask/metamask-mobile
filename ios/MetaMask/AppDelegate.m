/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "AppDelegate.h"
#import <Fabric/Fabric.h>
#import <Crashlytics/Crashlytics.h>


#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <react-native-branch/RNBranch.h>


@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions{

  [Fabric with:@[[Crashlytics class]]];

  [RNBranch useTestInstance];
  [RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];

  NSURL *jsCodeLocation;
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];

  NSString* foxCode = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"fox_code"];

  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"MetaMask"
                                               initialProperties: @{@"foxCode": foxCode}
                                                   launchOptions:launchOptions];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  //Keep splash screen while loading the bundle
  UIView* launchScreenView = [[[NSBundle mainBundle] loadNibNamed:@"LaunchScreen" owner:self options:nil] objectAtIndex:0];
  launchScreenView.frame = self.window.bounds;
  rootView.loadingView = launchScreenView;

  return YES;
}

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if (![RNBranch.branch application:app openURL:url options:options]) {
    // do other deep link routing for the specific SDKs
  }
  return YES;
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray *restorableObjects))restorationHandler {
  return [RNBranch continueUserActivity:userActivity];
}

@end
