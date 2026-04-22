#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

#import <RNBranch/RNBranch.h>
#import <Firebase.h>
#import <BrazeKit/BrazeKit-Swift.h>
#import "BrazeReactBridge.h"
#import "BrazeReactUtils.h"

static Braze *_braze = nil;

@implementation AppDelegate

+ (Braze *)braze {
  return _braze;
}

+ (void)setBraze:(Braze *)braze {
  _braze = braze;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"MetaMask";
  [FIRApp configure];
  NSString *foxCodeFromBundle = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"fox_code"];

  NSString *foxCode;

  if(foxCodeFromBundle != nil){
    foxCode = foxCodeFromBundle;
  } else {
    foxCode = @"debug";
  }

  [RNBranch.branch checkPasteboardOnInstall];
 // Uncomment this line to use the test key instead of the live one.
  // [RNBranch useTestInstance];
  [RNBranch initSessionWithLaunchOptions:launchOptions isReferrable:YES];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{@"foxCode": foxCode};

  // Setup Braze — credentials come from Info.plist (injected via MM_BRAZE_API_KEY_IOS / MM_BRAZE_SDK_ENDPOINT from .ios.env)
  NSString *brazeApiKey = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"braze_api_key"];
  NSString *brazeEndpoint = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"braze_sdk_endpoint"];
  if (brazeApiKey.length > 0 && brazeEndpoint.length > 0) {
    BRZConfiguration *configuration = [[BRZConfiguration alloc] initWithApiKey:brazeApiKey
                                                                      endpoint:brazeEndpoint];
    configuration.logger.level = BRZLoggerLevelInfo;
    // push.automation handles APNs token registration and Braze-originated notification display.
    // requestAuthorizationAtLaunch is NO so the existing permission flow (Firebase/Notifee) is preserved.
    configuration.push.automation = [[BRZConfigurationPushAutomation alloc] initEnablingAllAutomations:YES];
    configuration.push.automation.requestAuthorizationAtLaunch = NO;
    configuration.forwardUniversalLinks = YES;
    Braze *braze = [BrazeReactBridge initBraze:configuration];
    braze.delegate = self;
    AppDelegate.braze = braze;
    [[BrazeReactUtils sharedInstance] populateInitialPayloadFromLaunchOptions:launchOptions];
  }

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  #if DEBUG
    return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
  #endif
  return [RNBranch application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RNBranch continueUserActivity:userActivity];
  //BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  //return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{

  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

#pragma mark - BrazeDelegate

// Route Braze deep link URLs ourselves instead of letting BrazeKit open them
// via UIApplication.open (which would cause a duplicate delivery — once from
// the Braze RN bridge JS event and once from the system URL handler).
//
// Universal links (Branch domains) are forwarded to Branch for proper routing.
// All other URLs are suppressed here; they are handled exclusively through
// the JS PUSH_NOTIFICATION_EVENT, tagged with ORIGIN_BRAZE.
- (BOOL)braze:(Braze *)braze shouldOpenURL:(BRZURLContext *)context {
  NSString *host = context.url.host;
  if (host &&
      ([host containsString:@"app.link"] ||
       [host containsString:@"test-app.link"] ||
       [host containsString:@"link.metamask.io"] ||
       [host containsString:@"link-test.metamask.io"])) {
    [[Branch getInstance] handleDeepLink:context.url];
    return NO;
  }
  return NO;
}

@end
