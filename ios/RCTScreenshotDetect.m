//
//  RCTScreenshotDetectModule.m
//  MetaMask
//
//  Created by Gustavo Antunes on 20-09-22.
//  Copyright © 2022 MetaMask. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RCTScreenshotDetect.h"

@implementation RCTScreenshotDetect
RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[@"UIApplicationUserDidTakeScreenshotNotification"];
}

- (void)startObserving {
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center addObserver:self
    selector:@selector(sendNotificationToRN:)
    name:UIApplicationUserDidTakeScreenshotNotification
    object:nil];
}

- (void)stopObserving {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)sendNotificationToRN:(NSNotification *)notification {
    [self sendEventWithName:notification.name
                   body:nil];
}

@end
