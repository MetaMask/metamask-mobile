// ObjC++ shim: BrazeReactBridge.h imports BrazeKit-Swift.h which creates
// type conflicts when exposed to Swift alongside `import BrazeKit`.
// This file keeps those imports in ObjC++ and exposes plain C functions.
// .mm for React’s C++ headers; extern "C" to prevent name-mangling.

#import <BrazeKit/BrazeKit-Swift.h>
#import "BrazeReactBridge.h"
#import "BrazeReactUtils.h"

extern "C" {

id BrazeHelperInit(id configuration) {
  return [BrazeReactBridge initBraze:(BRZConfiguration *)configuration];
}

void BrazeHelperPopulateInitialPayload(NSDictionary *launchOptions) {
  [[BrazeReactUtils sharedInstance] populateInitialPayloadFromLaunchOptions:launchOptions];
}

} // extern "C"
