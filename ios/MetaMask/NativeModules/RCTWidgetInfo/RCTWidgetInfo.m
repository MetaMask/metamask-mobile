// RCT_EXTERN_MODULE shim exposing the Swift implementation
// (RCTWidgetInfo.swift) to React Native's bridge. No import of a
// "*-Swift.h" header is needed here — RCT_EXTERN_MODULE only declares the
// ObjC-visible interface; the Swift class's @objc(RCTWidgetInfo) name is
// resolved by the ObjC runtime at load time.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RCTWidgetInfo, NSObject)

RCT_EXTERN_METHOD(getInstalledWidgets:(RCTPromiseResolveBlock)resolve
                                rejecter:(RCTPromiseRejectBlock)reject)

@end
