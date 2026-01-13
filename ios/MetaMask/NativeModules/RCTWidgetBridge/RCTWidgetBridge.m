//
//  RCTWidgetBridge.m
//  MetaMask
//
//  React Native bridge for iOS Widget communication
//

#import "RCTWidgetBridge.h"
#import <React/RCTLog.h>
#import <WidgetKit/WidgetKit.h>

// Import Swift bridging header for WidgetDataManager
#import "MetaMask-Swift.h"

@implementation RCTWidgetBridge

RCT_EXPORT_MODULE(WidgetBridge);

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

/**
 * Updates the widget with new account data
 * @param accounts Array of account objects with id, name, address, and type
 */
RCT_EXPORT_METHOD(updateAccounts:(NSArray *)accounts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.metamask.wallet"];
        
        if (!sharedDefaults) {
            reject(@"ERROR", @"Failed to access App Group UserDefaults", nil);
            return;
        }
        
        NSError *error = nil;
        NSData *data = [NSJSONSerialization dataWithJSONObject:accounts options:0 error:&error];
        
        if (error) {
            reject(@"ERROR", @"Failed to serialize accounts", error);
            return;
        }
        
        [sharedDefaults setObject:data forKey:@"widget_accounts"];
        [sharedDefaults setObject:[NSDate date] forKey:@"widget_last_update"];
        [sharedDefaults synchronize];
        
        // Reload widgets
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadAllTimelines];
        }
        
        RCTLogInfo(@"WidgetBridge: Updated %lu accounts", (unsigned long)accounts.count);
        resolve(@YES);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

/**
 * Updates the widget with new balance data
 * @param balances Array of balance objects with accountId, totalFiatBalance, currency, and lastUpdated
 */
RCT_EXPORT_METHOD(updateBalances:(NSArray *)balances
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.metamask.wallet"];
        
        if (!sharedDefaults) {
            reject(@"ERROR", @"Failed to access App Group UserDefaults", nil);
            return;
        }
        
        // Add timestamp to each balance
        NSMutableArray *balancesWithTimestamp = [NSMutableArray array];
        for (NSDictionary *balance in balances) {
            NSMutableDictionary *balanceWithTimestamp = [balance mutableCopy];
            balanceWithTimestamp[@"lastUpdated"] = @([[NSDate date] timeIntervalSince1970]);
            [balancesWithTimestamp addObject:balanceWithTimestamp];
        }
        
        NSError *error = nil;
        NSData *data = [NSJSONSerialization dataWithJSONObject:balancesWithTimestamp options:0 error:&error];
        
        if (error) {
            reject(@"ERROR", @"Failed to serialize balances", error);
            return;
        }
        
        [sharedDefaults setObject:data forKey:@"widget_balances"];
        [sharedDefaults synchronize];
        
        // Reload widgets
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadAllTimelines];
        }
        
        RCTLogInfo(@"WidgetBridge: Updated %lu balances", (unsigned long)balances.count);
        resolve(@YES);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

/**
 * Updates both accounts and balances in a single call
 */
RCT_EXPORT_METHOD(updateWidgetData:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.metamask.wallet"];
        
        if (!sharedDefaults) {
            reject(@"ERROR", @"Failed to access App Group UserDefaults", nil);
            return;
        }
        
        NSArray *accounts = data[@"accounts"];
        NSArray *balances = data[@"balances"];
        NSString *currency = data[@"currency"];
        
        NSError *error = nil;
        
        // Save accounts
        if (accounts) {
            NSData *accountsData = [NSJSONSerialization dataWithJSONObject:accounts options:0 error:&error];
            if (!error) {
                [sharedDefaults setObject:accountsData forKey:@"widget_accounts"];
            }
        }
        
        // Save balances with timestamp
        if (balances) {
            NSMutableArray *balancesWithTimestamp = [NSMutableArray array];
            for (NSDictionary *balance in balances) {
                NSMutableDictionary *balanceWithTimestamp = [balance mutableCopy];
                balanceWithTimestamp[@"lastUpdated"] = @([[NSDate date] timeIntervalSince1970]);
                [balancesWithTimestamp addObject:balanceWithTimestamp];
            }
            
            NSData *balancesData = [NSJSONSerialization dataWithJSONObject:balancesWithTimestamp options:0 error:&error];
            if (!error) {
                [sharedDefaults setObject:balancesData forKey:@"widget_balances"];
            }
        }
        
        // Save currency
        if (currency) {
            [sharedDefaults setObject:currency forKey:@"widget_currency"];
        }
        
        [sharedDefaults setObject:[NSDate date] forKey:@"widget_last_update"];
        [sharedDefaults synchronize];
        
        // Reload widgets
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadAllTimelines];
        }
        
        RCTLogInfo(@"WidgetBridge: Updated widget data");
        resolve(@YES);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

/**
 * Clears all widget data (call on logout)
 */
RCT_EXPORT_METHOD(clearWidgetData:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.metamask.wallet"];
        
        if (!sharedDefaults) {
            reject(@"ERROR", @"Failed to access App Group UserDefaults", nil);
            return;
        }
        
        [sharedDefaults removeObjectForKey:@"widget_accounts"];
        [sharedDefaults removeObjectForKey:@"widget_balances"];
        [sharedDefaults removeObjectForKey:@"widget_currency"];
        [sharedDefaults removeObjectForKey:@"widget_last_update"];
        [sharedDefaults synchronize];
        
        // Reload widgets
        if (@available(iOS 14.0, *)) {
            [WidgetCenter.sharedCenter reloadAllTimelines];
        }
        
        RCTLogInfo(@"WidgetBridge: Cleared widget data");
        resolve(@YES);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

/**
 * Forces widget refresh
 */
RCT_EXPORT_METHOD(refreshWidget:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 14.0, *)) {
        [WidgetCenter.sharedCenter reloadAllTimelines];
        resolve(@YES);
    } else {
        reject(@"ERROR", @"Widgets require iOS 14+", nil);
    }
}

/**
 * Check if widgets are supported
 */
RCT_EXPORT_METHOD(isWidgetSupported:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 14.0, *)) {
        resolve(@YES);
    } else {
        resolve(@NO);
    }
}

@end

