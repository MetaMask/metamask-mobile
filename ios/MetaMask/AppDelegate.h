#import <Firebase.h>
#import <Expo/Expo.h>
#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>

@class Braze;

@interface AppDelegate : EXAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;
@property (class, strong, nonatomic) Braze *braze;

@end
