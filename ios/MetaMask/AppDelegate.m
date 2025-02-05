#import "AppDelegate.h"
#import <Firebase.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTPushNotificationManager.h>
#import <RNBranch/RNBranch.h>
#import <UserNotifications/UserNotifications.h>

#if DEBUG
#include <EXDevLauncher/EXDevLauncherController.h>
#endif

#import <Expo/Expo.h> // Required for `EXReactDelegateWrapper`

@interface AppDelegate ()

@property (nonatomic, strong) EXReactDelegateWrapper *reactDelegate;

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

  self.moduleName = @"MetaMask";

  // Initialize Firebase
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }


  // Initialize Branch.io
  [RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];

  NSString *foxCodeFromBundle = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"fox_code"];
  NSString *foxCode = foxCodeFromBundle ? foxCodeFromBundle : @"debug";

  // Create RootViewController
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [self createRootViewController];
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  self.initialProps = @{@"foxCode": foxCode};

  // Register for Push Notifications
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
                          if (!error) {
                            dispatch_async(dispatch_get_main_queue(), ^{
                              [application registerForRemoteNotifications];
                            });
                          }
                        }];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}


// Push Notification Registration
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [RCTPushNotificationManager didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RCTPushNotificationManager didFailToRegisterForRemoteNotificationsWithError:error];
}

// Handle Push Notifications
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
  fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  [RCTPushNotificationManager didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

// Handle Deep Links (Branch.io)
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  #if DEBUG
  if ([EXDevLauncherController.sharedInstance onDeepLink:url options:options]) {
    return YES;
  }
  #endif
  return [RNBranch application:app openURL:url options:options];
}

// Handle Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RNBranch continueUserActivity:userActivity];
}

// Get Bundle URL for React Native
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

// ✅ This method is inherited from EXAppDelegateWrapper
- (UIViewController *)createRootViewController {
  return [super createRootViewController];
}

@end
