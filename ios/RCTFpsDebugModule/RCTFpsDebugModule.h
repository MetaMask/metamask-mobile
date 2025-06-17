#import <React/RCTBridgeModule.h>

@interface RCTFpsDebugModule : NSObject <RCTBridgeModule>
@property (nonatomic, weak) RCTBridge *bridge;

@end
