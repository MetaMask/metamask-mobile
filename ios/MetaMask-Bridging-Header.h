//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTHTTPRequestHandler.h>
#import <Expo/Expo.h>

// Thin C wrappers around BrazeReactBridge / BrazeReactUtils.
// Implemented in BrazeHelper.mm.
// Uses id (AnyObject in Swift) to avoid importing BrazeKit-Swift.h here,
// which would create type-identity conflicts with `import BrazeKit` in Swift.
id _Nonnull BrazeHelperInit(id _Nonnull configuration);
void BrazeHelperPopulateInitialPayload(NSDictionary * _Nullable launchOptions);
