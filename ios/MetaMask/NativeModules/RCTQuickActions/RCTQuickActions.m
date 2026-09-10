#import "RCTQuickActions.h"

#import <UIKit/UIKit.h>

static NSString *pendingClipboard;

@implementation RCTQuickActions

RCT_EXPORT_MODULE(QuickActions);

+ (void)storePendingClipboard:(NSString *)clipboard
{
  pendingClipboard = [clipboard copy];
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(setShortcutItems:(NSArray<NSDictionary *> *)items)
{
  NSMutableArray<UIApplicationShortcutItem *> *shortcutItems =
      [NSMutableArray arrayWithCapacity:items.count];

  for (NSDictionary *item in items) {
    NSString *type = item[@"type"];
    NSString *title = item[@"title"];
    if (type.length == 0 || title.length == 0) {
      continue;
    }

    NSString *subtitle = item[@"subtitle"];
    NSString *systemImageName = item[@"systemImageName"];
    UIApplicationShortcutIcon *icon = nil;
    if (systemImageName.length > 0) {
      icon = [UIApplicationShortcutIcon iconWithSystemImageName:systemImageName];
    }

    NSDictionary *userInfo = item[@"userInfo"];
    UIApplicationShortcutItem *shortcutItem =
        [[UIApplicationShortcutItem alloc] initWithType:type
                                         localizedTitle:title
                                      localizedSubtitle:subtitle
                                                   icon:icon
                                               userInfo:userInfo];
    [shortcutItems addObject:shortcutItem];
  }

  UIApplication.sharedApplication.shortcutItems = shortcutItems;
}

RCT_EXPORT_METHOD(clearShortcutItems)
{
  UIApplication.sharedApplication.shortcutItems = @[];
}

RCT_REMAP_METHOD(consumePendingClipboard,
                 consumePendingClipboardWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *clipboard = pendingClipboard;
  pendingClipboard = nil;
  resolve(clipboard);
}

@end
