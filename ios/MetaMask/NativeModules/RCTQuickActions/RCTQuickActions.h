#import <React/RCTBridgeModule.h>

@interface RCTQuickActions : NSObject <RCTBridgeModule>
+ (void)storePendingClipboard:(nullable NSString *)clipboard;
@end
