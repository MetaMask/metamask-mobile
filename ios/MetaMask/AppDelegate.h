#import <Firebase.h>
#import <Expo/Expo.h>
#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>
#import <BrazeKit/BrazeKit-Swift.h>

@interface AppDelegate : EXAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate, BrazeDelegate>

@property (nonatomic, strong) UIWindow *window;
@property (class, strong, nonatomic) Braze *braze;

@end
