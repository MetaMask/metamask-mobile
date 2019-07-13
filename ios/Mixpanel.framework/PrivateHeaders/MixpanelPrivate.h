//
//  MixpanelPrivate.h
//  Mixpanel
//
//  Created by Sam Green on 6/16/16.
//  Copyright © 2016 Mixpanel. All rights reserved.
//

#import "Mixpanel.h"
#import "MPNetwork.h"
#import "SessionMetadata.h"
#import "MixpanelType.h"

#if TARGET_OS_IOS
#import <UIKit/UIKit.h>
#endif

#if !MIXPANEL_NO_REACHABILITY_SUPPORT
#import <CoreTelephony/CTCarrier.h>
#import <CoreTelephony/CTTelephonyNetworkInfo.h>
#import <SystemConfiguration/SystemConfiguration.h>
#endif

#if !MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT
#import "Mixpanel+AutomaticTracks.h"
#import "AutomaticTracksConstants.h"
#import "AutomaticEvents.h"
#import "MixpanelExceptionHandler.h"
#endif

#if !MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT
#import "MPResources.h"
#import "MPABTestDesignerConnection.h"
#import "UIView+MPHelpers.h"
#import "MPDesignerEventBindingMessage.h"
#import "MPDesignerSessionCollection.h"
#import "MPEventBinding.h"
#import "MPNotification.h"
#import "MPTakeoverNotification.h"
#import "MPMiniNotification.h"
#import "MPNotificationViewController.h"
#import "MPSwizzler.h"
#import "MPTweakStore.h"
#import "MPVariant.h"
#import "MPWebSocket.h"
#import "MPNotification.h"
#endif

#if !MIXPANEL_NO_CONNECT_INTEGRATION_SUPPORT
#import "MPConnectIntegrations.h"
#endif

#if defined(MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT) && defined(MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT)
@interface Mixpanel ()
#elif defined(MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT)
@interface Mixpanel () <TrackDelegate>
#elif defined(MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT)
@interface Mixpanel () <MPNotificationViewControllerDelegate>
#else
@interface Mixpanel () <MPNotificationViewControllerDelegate, TrackDelegate>
#endif

{
    NSUInteger _flushInterval;
    BOOL _enableVisualABTestAndCodeless;
}

#if !MIXPANEL_NO_REACHABILITY_SUPPORT
@property (nonatomic, assign) SCNetworkReachabilityRef reachability;
@property (nonatomic, strong) CTTelephonyNetworkInfo *telephonyInfo;
#endif

#if !MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT
@property (nonatomic, strong) UILongPressGestureRecognizer *testDesignerGestureRecognizer;
@property (nonatomic, strong) MPABTestDesignerConnection *abtestDesignerConnection;
#endif

#if !MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT
@property (nonatomic) AutomaticTrackMode validationMode;
@property (nonatomic) NSUInteger validationEventCount;
@property (nonatomic, getter=isValidationEnabled) BOOL validationEnabled;
@property (atomic, strong) AutomaticEvents *automaticEvents;
#endif

#if !MIXPANEL_NO_CONNECT_INTEGRATION_SUPPORT
@property (nonatomic, strong) MPConnectIntegrations *connectIntegrations;
#endif

#if !defined(MIXPANEL_WATCHOS) && !defined(MIXPANEL_MACOS)
@property (nonatomic, assign) UIBackgroundTaskIdentifier taskId;
@property (nonatomic, strong) UIViewController *notificationViewController;
#endif

// re-declare internally as readwrite
@property (atomic, strong) MixpanelPeople *people;
@property (atomic, strong) NSMutableDictionary<NSString*, MixpanelGroup*> * cachedGroups;
@property (atomic, strong) MPNetwork *network;
@property (atomic, copy) NSString *distinctId;
@property (atomic, copy) NSString *alias;
@property (atomic, copy) NSString *anonymousId;
@property (atomic, copy) NSString *userId;

@property (nonatomic, copy) NSString *apiToken;
@property (atomic, strong) NSDictionary *superProperties;
@property (atomic, strong) NSDictionary *automaticProperties;
@property (nonatomic, strong) NSTimer *timer;
@property (nonatomic, strong) NSMutableArray *eventsQueue;
@property (nonatomic, strong) NSMutableArray *peopleQueue;
@property (nonatomic, strong) NSMutableArray *groupsQueue;
@property (nonatomic) dispatch_queue_t serialQueue;
@property (nonatomic) dispatch_queue_t networkQueue;
@property (nonatomic, strong) NSMutableDictionary *timedEvents;
@property (nonatomic, strong) SessionMetadata *sessionMetadata;

@property (nonatomic) BOOL decideResponseCached;
@property (nonatomic) BOOL hasAddedObserver;
@property (nonatomic, strong) NSNumber *automaticEventsEnabled;
@property (nonatomic, copy) NSArray *notifications;
@property (nonatomic, copy) NSArray *triggeredNotifications;
@property (nonatomic, strong) id currentlyShowingNotification;
@property (nonatomic, strong) NSMutableSet *shownNotifications;

@property (nonatomic, strong) NSSet *variants;
@property (nonatomic, strong) NSSet *eventBindings;

@property (nonatomic, assign) BOOL optOutStatus;
@property (nonatomic, assign) BOOL optOutStatusNotSet;

@property (nonatomic, strong) NSString *savedUrbanAirshipChannelID;

@property (atomic, copy) NSString *switchboardURL;

+ (void)assertPropertyTypes:(NSDictionary *)properties;

+ (BOOL)isAppExtension;
#if !MIXPANEL_NO_UIAPPLICATION_ACCESS
+ (UIApplication *)sharedUIApplication;
#endif

- (NSString *)deviceModel;
- (NSString *)IFA;

- (void)archivePeople;
- (NSString *)defaultDistinctId;
- (void)archive;
- (NSString *)eventsFilePath;
- (NSString *)peopleFilePath;
- (NSString *)groupsFilePath;
- (NSString *)propertiesFilePath;
- (NSString *)optOutFilePath;

// for group caching
- (NSString *)keyForGroup:(NSString *)groupKey groupID:(id<MixpanelType>)groupID;
#if !MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT
- (void)trackPushNotification:(NSDictionary *)userInfo;
- (void)showNotificationWithObject:(MPNotification *)notification;
- (void)markVariantRun:(MPVariant *)variant;
- (void)checkForDecideResponseWithCompletion:(void (^)(NSArray *notifications, NSSet *variants, NSSet *eventBindings))completion;
- (void)checkForDecideResponseWithCompletion:(void (^)(NSArray *notifications, NSSet *variants, NSSet *eventBindings))completion useCache:(BOOL)useCache;
#endif

@end
