#import <Foundation/Foundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <Cocoa/Cocoa.h>
#endif
#import "MixpanelPeople.h"
#import "MixpanelType.h"


#if defined(MIXPANEL_WATCHOS)
#define MIXPANEL_FLUSH_IMMEDIATELY 1
#define MIXPANEL_NO_APP_LIFECYCLE_SUPPORT 1
#endif

#if (defined(MIXPANEL_WATCHOS) || defined(MIXPANEL_MACOS))
#define MIXPANEL_NO_UIAPPLICATION_ACCESS 1
#endif

#if (defined(MIXPANEL_TVOS) || defined(MIXPANEL_WATCHOS) || defined(MIXPANEL_MACOS))
#define MIXPANEL_NO_REACHABILITY_SUPPORT 1
#define MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT 1
#define MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT 1
#define MIXPANEL_NO_CONNECT_INTEGRATION_SUPPORT 1
#endif

@class    MixpanelPeople;
@class    MixpanelGroup;
@protocol MixpanelDelegate;

NS_ASSUME_NONNULL_BEGIN

/*!
 A string constant "mini" that respresent Mini Notification
 */
extern NSString *const MPNotificationTypeMini;
/*!
 A string constant "takeover" that respresent Takeover Notification
 */
extern NSString *const MPNotificationTypeTakeover;

/*!
 Mixpanel API.

 The primary interface for integrating Mixpanel with your app.

 Use the Mixpanel class to set up your project and track events in Mixpanel
 Engagement. It now also includes a <code>people</code> property for accessing
 the Mixpanel People API.

 <pre>
 // Initialize the API
 Mixpanel *mixpanel = [Mixpanel sharedInstanceWithToken:@"YOUR API TOKEN"];

 // Track an event in Mixpanel Engagement
 [mixpanel track:@"Button Clicked"];

 // Set properties on a user in Mixpanel People
 [mixpanel identify:@"CURRENT USER DISTINCT ID"];
 [mixpanel.people set:@"Plan" to:@"Premium"];
 </pre>

 For more advanced usage, please see the <a
 href="https://mixpanel.com/docs/integration-libraries/iphone">Mixpanel iPhone
 Library Guide</a>.
 */
@interface Mixpanel : NSObject

#pragma mark Properties

/*!
 Accessor to the Mixpanel People API object.

 See the documentation for MixpanelDelegate below for more information.
 */
@property (atomic, readonly, strong) MixpanelPeople *people;

/*!
 The distinct ID of the current user.

 A distinct ID is a string that uniquely identifies one of your users. By default,
 we'll use the device's advertisingIdentifier UUIDString, if that is not available
 we'll use the device's identifierForVendor UUIDString, and finally if that
 is not available we will generate a new random UUIDString. To change the
 current distinct ID, use the <code>identify:</code> method.
 */
@property (atomic, readonly, copy) NSString *distinctId;

/*!
 The default anonymous Id / distinct Id  given to the events before identify.

 A default distinct ID is a string that uniquely identifies the anonymous activity.
 By default, we'll use the device's advertisingIdentifier UUIDString, if that is not
 available we'll use the device's identifierForVendor UUIDString, and finally if that
 is not available we will generate a new random UUIDString.
 */
@property (atomic, readonly, copy) NSString *anonymousId;

/*!
  The user ID with which <code>identify:</code> is called with.

  This is null until <code>identify:</code> is called and is set to the id
  with which identify is called with.
 */
@property (atomic, readonly, copy) NSString *userId;

/*!
 The alias of the current user.

 An alias is another string that uniquely identifies one of your users. Typically,
 this is the user ID from your database. By using an alias you can link pre- and
 post-sign up activity as well as cross-platform activity under one distinct ID.
 To set the alias use the <code>createAlias:forDistinctID:</code> method.
 */
@property (atomic, readonly, copy) NSString *alias;

/*!
 A flag which says if a distinctId is already in peristence from old sdk
  Defaults to NO.
 */
@property (atomic) BOOL hadPersistedDistinctId;

/*!
 The base URL used for Mixpanel API requests.

 Useful if you need to proxy Mixpanel requests. Defaults to
 https://api.mixpanel.com.
 */
@property (nonatomic, copy) NSString *serverURL;

/*!
 Flush timer's interval.

 Setting a flush interval of 0 will turn off the flush timer.
 */
@property (atomic) NSUInteger flushInterval;

/*!
 Control whether the library should flush data to Mixpanel when the app
 enters the background.

 Defaults to YES. Only affects apps targeted at iOS 4.0, when background
 task support was introduced, and later.
 */
@property (atomic) BOOL flushOnBackground;

/*!
 Controls whether to show spinning network activity indicator when flushing
 data to the Mixpanel servers.

 Defaults to YES.
 */
@property (atomic) BOOL shouldManageNetworkActivityIndicator;

/*!
 Controls whether to automatically check for notifications for the
 currently identified user when the application becomes active.

 Defaults to YES. Will fire a network request on
 <code>applicationDidBecomeActive</code> to retrieve a list of valid notifications
 for the currently identified user.
 */
@property (atomic) BOOL checkForNotificationsOnActive;

/*!
 Controls whether to automatically check for A/B test variants for the
 currently identified user when the application becomes active.

 Defaults to YES. Will fire a network request on
 <code>applicationDidBecomeActive</code> to retrieve a list of valid variants
 for the currently identified user.
 */
@property (atomic) BOOL checkForVariantsOnActive;

/*!
 Controls whether to automatically check for and show in-app notifications
 for the currently identified user when the application becomes active.

 Defaults to YES.
 */
@property (atomic) BOOL showNotificationOnActive;

/*!
 Controls whether to automatically send the client IP Address as part of
 event tracking. With an IP address, geo-location is possible down to neighborhoods
 within a city, although the Mixpanel Dashboard will just show you city level location
 specificity. For privacy reasons, you may be in a situation where you need to forego
 effectively having access to such granular location information via the IP Address.

 Defaults to YES.
 */
@property (atomic) BOOL useIPAddressForGeoLocation;

/*!
 Controls whether to enable the visual test designer for A/B testing and codeless on mixpanel.com.
 You will be unable to edit A/B tests and codeless events with this disabled, however *previously*
 created A/B tests and codeless events will still be delivered.

 Defaults to YES.
 */
@property (atomic) BOOL enableVisualABTestAndCodeless;

/*!
 Controls whether to enable the run time debug logging at all levels. Note that the
 Mixpanel SDK uses Apple System Logging to forward log messages to `STDERR`, this also
 means that mixpanel logs are segmented by log level. Settings this to `YES` will enable
 Mixpanel logging at the following levels:

   * Error - Something has failed
   * Warning - Something is amiss and might fail if not corrected
   * Info - The lowest priority that is normally logged, purely informational in nature
   * Debug - Information useful only to developers, and normally not logged.


 Defaults to NO.
 */
@property (atomic) BOOL enableLogging;

/*!
 Determines the time, in seconds, that a mini notification will remain on
 the screen before automatically hiding itself.

 Defaults to 6.0.
 */
@property (atomic) CGFloat miniNotificationPresentationTime;

#if !MIXPANEL_NO_AUTOMATIC_EVENTS_SUPPORT
/*!
 The minimum session duration (ms) that is tracked in automatic events.

 The default value is 10000 (10 seconds).
 */
@property (atomic) UInt64 minimumSessionDuration;

/*!
 The maximum session duration (ms) that is tracked in automatic events.

 The default value is UINT64_MAX (no maximum session duration).
 */
@property (atomic) UInt64 maximumSessionDuration;
#endif

/*!
 The a MixpanelDelegate object that can be used to assert fine-grain control
 over Mixpanel network activity.

 Using a delegate is optional. See the documentation for MixpanelDelegate
 below for more information.
 */
@property (atomic, weak) id<MixpanelDelegate> delegate; // allows fine grain control over uploading (optional)

#pragma mark Tracking

/*!
 Returns (and creates, if needed) a singleton instance of the API.

 This method will return a singleton instance of the <code>Mixpanel</code> class for
 you using the given project token. If an instance does not exist, this method will create
 one using <code>initWithToken:launchOptions:andFlushInterval:</code>. If you only have one
 instance in your project, you can use <code>sharedInstance</code> to retrieve it.

 <pre>
 [Mixpanel sharedInstance] track:@"Something Happened"]];
 </pre>

 If you are going to use this singleton approach,
 <code>sharedInstanceWithToken:</code> <b>must be the first call</b> to the
 <code>Mixpanel</code> class, since it performs important initializations to
 the API.

 @param apiToken        your project token
 */
+ (Mixpanel *)sharedInstanceWithToken:(NSString *)apiToken;

/*!
 Initializes a singleton instance of the API, uses it to set whether or not to opt out tracking for
 GDPR compliance, and then returns it.

 This is the preferred method for creating a sharedInstance with a mixpanel
 like above. With the optOutTrackingByDefault parameter, Mixpanel tracking can be opted out by default.

 @param apiToken        your project token
 @param optOutTrackingByDefault  whether or not to be opted out from tracking by default

 */
+ (Mixpanel *)sharedInstanceWithToken:(NSString *)apiToken optOutTrackingByDefault:(BOOL)optOutTrackingByDefault;

/*!
 Initializes a singleton instance of the API, uses it to track launchOptions information,
 and then returns it.

 This is the preferred method for creating a sharedInstance with a mixpanel
 like above. With the launchOptions parameter, Mixpanel can track referral
 information created by push notifications.

 @param apiToken        your project token
 @param launchOptions   your application delegate's launchOptions

 */
+ (Mixpanel *)sharedInstanceWithToken:(NSString *)apiToken launchOptions:(nullable NSDictionary *)launchOptions;

/*!
 Initializes a singleton instance of the API, uses it to track launchOptions information,
 and then returns it.

 This is the preferred method for creating a sharedInstance with a mixpanel
 like above. With the trackCrashes and automaticPushTracking parameter, Mixpanel can track crashes and automatic push.

 @param apiToken        your project token
 @param launchOptions   your application delegate's launchOptions
 @param trackCrashes    whether or not to track crashes in Mixpanel. may want to disable if you're seeing
 issues with your crash reporting for either signals or exceptions
 @param automaticPushTracking    whether or not to automatically track pushes sent from Mixpanel
 */
+ (Mixpanel *)sharedInstanceWithToken:(NSString *)apiToken launchOptions:(nullable NSDictionary *)launchOptions trackCrashes:(BOOL)trackCrashes automaticPushTracking:(BOOL)automaticPushTracking;

/*!
 Initializes a singleton instance of the API, uses it to track launchOptions information,
 and then returns it.

 This is the preferred method for creating a sharedInstance with a mixpanel
 like above. With the optOutTrackingByDefault parameter, Mixpanel tracking can be opted out by default.

 @param apiToken        your project token
 @param launchOptions   your application delegate's launchOptions
 @param trackCrashes    whether or not to track crashes in Mixpanel. may want to disable if you're seeing
 issues with your crash reporting for either signals or exceptions
 @param automaticPushTracking    whether or not to automatically track pushes sent from Mixpanel
 @param optOutTrackingByDefault  whether or not to be opted out from tracking by default
 */
+ (Mixpanel *)sharedInstanceWithToken:(NSString *)apiToken launchOptions:(nullable NSDictionary *)launchOptions trackCrashes:(BOOL)trackCrashes automaticPushTracking:(BOOL)automaticPushTracking optOutTrackingByDefault:(BOOL)optOutTrackingByDefault;

/*!
 Returns a previously instantiated singleton instance of the API.

 The API must be initialized with <code>sharedInstanceWithToken:</code> or
 <code>initWithToken:launchOptions:andFlushInterval</code> before calling this class method.
 This method will return <code>nil</code> if there are no instances created. If there is more than
 one instace, it will return the first one that was created by using <code>sharedInstanceWithToken:</code>
 or <code>initWithToken:launchOptions:andFlushInterval:</code>.
 */
+ (nullable Mixpanel *)sharedInstance;

/*!
 Initializes an instance of the API with the given project token. This also sets
 it as a shared instance so you can use <code>sharedInstance</code> or
 <code>sharedInstanceWithToken:</code> to retrieve this object later.

 Creates and initializes a new API object. See also <code>sharedInstanceWithToken:</code>.

 @param apiToken        your project token
 @param launchOptions   optional app delegate launchOptions
 @param flushInterval   interval to run background flushing
 @param trackCrashes    whether or not to track crashes in Mixpanel. may want to disable if you're seeing
                        issues with your crash reporting for either signals or exceptions
 */
- (instancetype)initWithToken:(NSString *)apiToken
                launchOptions:(nullable NSDictionary *)launchOptions
                flushInterval:(NSUInteger)flushInterval
                 trackCrashes:(BOOL)trackCrashes;

/*!
 Initializes an instance of the API with the given project token. This also sets
 it as a shared instance so you can use <code>sharedInstance</code> or
 <code>sharedInstanceWithToken:</code> to retrieve this object later.

 Creates and initializes a new API object. See also <code>sharedInstanceWithToken:</code>.

 @param apiToken        your project token
 @param launchOptions   optional app delegate launchOptions
 @param flushInterval   interval to run background flushing
 @param trackCrashes    whether or not to track crashes in Mixpanel. may want to disable if you're seeing
 issues with your crash reporting for either signals or exceptions
 @param automaticPushTracking    whether or not to automatically track pushes sent from Mixpanel
 */
- (instancetype)initWithToken:(NSString *)apiToken
                launchOptions:(nullable NSDictionary *)launchOptions
                flushInterval:(NSUInteger)flushInterval
                 trackCrashes:(BOOL)trackCrashes
        automaticPushTracking:(BOOL)automaticPushTracking;

/*!
 Initializes an instance of the API with the given project token.

 Creates and initializes a new API object. See also <code>sharedInstanceWithToken:</code>.

 @param apiToken        your project token
 @param launchOptions   optional app delegate launchOptions
 @param flushInterval   interval to run background flushing
 */
- (instancetype)initWithToken:(NSString *)apiToken
                launchOptions:(nullable NSDictionary *)launchOptions
             andFlushInterval:(NSUInteger)flushInterval;

/*!
 Initializes an instance of the API with the given project token.

 Supports for the old initWithToken method format but really just passes
 launchOptions to the above method as nil.

 @param apiToken        your project token
 @param flushInterval   interval to run background flushing
 */
- (instancetype)initWithToken:(NSString *)apiToken andFlushInterval:(NSUInteger)flushInterval;

/*!
 Sets the distinct ID of the current user.

 As of version 2.3.1, Mixpanel will choose a default distinct ID based on
 whether you are using the AdSupport.framework or not.

 If you are not using the AdSupport Framework (iAds), then we use the
 <code>[UIDevice currentDevice].identifierForVendor</code> (IFV) string as the
 default distinct ID.  This ID will identify a user across all apps by the same
 vendor, but cannot be used to link the same user across apps from different
 vendors.

 If you are showing iAds in your application, you are allowed use the iOS ID
 for Advertising (IFA) to identify users. If you have this framework in your
 app, Mixpanel will use the IFA as the default distinct ID. If you have
 AdSupport installed but still don't want to use the IFA, you can define the
 <code>MIXPANEL_NO_IFA</code> preprocessor flag in your build settings, and
 Mixpanel will use the IFV as the default distinct ID.

 If we are unable to get an IFA or IFV, we will fall back to generating a
 random persistent UUID.

 For tracking events, you do not need to call <code>identify:</code> if you
 want to use the default.  However, <b>Mixpanel People always requires an
 explicit call to <code>identify:</code></b>. If calls are made to
 <code>set:</code>, <code>increment</code> or other <code>MixpanelPeople</code>
 methods prior to calling <code>identify:</code>, then they are queued up and
 flushed once <code>identify:</code> is called.

 If you'd like to use the default distinct ID for Mixpanel People as well
 (recommended), call <code>identify:</code> using the current distinct ID:
 <code>[mixpanel identify:mixpanel.distinctId]</code>.

 @param distinctId string that uniquely identifies the current user
 */
- (void)identify:(NSString *)distinctId;

/*!
 Sets the distinct ID of the current user. With the option of only updating the
 distinct ID value and not the Mixpanel People distinct ID.

 This method is not intended to be used unless you wish to prevent updating the Mixpanel
 People distinct ID value by passing a value of NO to the usePeople param. This can be
 useful if the user wishes to prevent People updates from being sent until the identify
 method is called.

 @param distinctId string that uniquely identifies the current user
 @param usePeople bool controls whether or not to set the people distinctId to the event distinctId
 */
- (void)identify:(NSString *)distinctId usePeople:(BOOL)usePeople;

/*!
 Add a group to this user's membership for a particular group key.
 The groupKey must be an NSString. The groupID should be a legal MixpanelType value.
 
 @param groupKey        the group key
 @param groupID         the group ID
 */
- (void)addGroup:(NSString *)groupKey groupID:(id<MixpanelType>)groupID;

/*!
 Remove a group from this user's membership for a particular group key.
 The groupKey must be an NSString. The groupID should be a legal MixpanelType value.
 
 @param groupKey        the group key
 @param groupID         the group ID
 */
- (void)removeGroup:(NSString *)groupKey groupID:(id<MixpanelType>)groupID;

/*!
 Set the group to which the user belongs.
 The groupKey must be an NSString. The groupID should be an array
 of MixpanelTypes.
 
 @param groupKey        the group key
 @param groupIDs        the group IDs
 */
- (void)setGroup:(NSString *)groupKey groupIDs:(NSArray<id<MixpanelType>> *)groupIDs;

/*!
 Convenience method to set a single group ID for the current user.
 
 @param groupKey        the group key
 @param groupID         the group ID
 */
- (void)setGroup:(NSString *)groupKey groupID:(id<MixpanelType>)groupID;

/*!
 Tracks an event with specific groups.
 
 Similar to track(), the data will also be sent to the specific group
 datasets. Group key/value pairs are upserted into the property map
 before tracking.
 The keys in groups must be NSString objects. values can be any legal
 MixpanelType objects. If the event is being timed, the timer will
 stop and be added as a property.
 
 @param event               event name
 @param properties          properties dictionary
 @param groups              groups dictionary, which contains key-value pairs
 for this event
 */
- (void)trackWithGroups:(NSString *)event properties:(NSDictionary *)properties groups:(NSDictionary *)groups;

/*!
 Get a MixpanelGroup identifier from groupKey and groupID.
 The groupKey must be an NSString. The groupID should be a legal MixpanelType value.
 
 @param groupKey    the group key
 @param groupID     the group ID
 */
- (MixpanelGroup *)getGroup:(NSString *)groupKey groupID:(id<MixpanelType>)groupID;

/*!
 Tracks an event.

 @param event           event name
 */
- (void)track:(NSString *)event;

/*!
 Tracks an event with properties.

 Properties will allow you to segment your events in your Mixpanel reports.
 Property keys must be <code>NSString</code> objects and values must be
 <code>NSString</code>, <code>NSNumber</code>, <code>NSNull</code>,
 <code>NSArray</code>, <code>NSDictionary</code>, <code>NSDate</code> or
 <code>NSURL</code> objects. If the event is being timed, the timer will
 stop and be added as a property.

 @param event           event name
 @param properties      properties dictionary
 */
- (void)track:(NSString *)event properties:(nullable NSDictionary *)properties;

/*!
 Registers super properties, overwriting ones that have already been set.

 Super properties, once registered, are automatically sent as properties for
 all event tracking calls. They save you having to maintain and add a common
 set of properties to your events. Property keys must be <code>NSString</code>
 objects and values must be <code>NSString</code>, <code>NSNumber</code>,
 <code>NSNull</code>, <code>NSArray</code>, <code>NSDictionary</code>,
 <code>NSDate</code> or <code>NSURL</code> objects.

 @param properties      properties dictionary
 */
- (void)registerSuperProperties:(NSDictionary *)properties;

/*!
 Registers super properties without overwriting ones that have already been
 set.

 Property keys must be <code>NSString</code> objects and values must be
 <code>NSString</code>, <code>NSNumber</code>, <code>NSNull</code>,
 <code>NSArray</code>, <code>NSDictionary</code>, <code>NSDate</code> or
 <code>NSURL</code> objects.

 @param properties      properties dictionary
 */
- (void)registerSuperPropertiesOnce:(NSDictionary *)properties;

/*!
 Registers super properties without overwriting ones that have already been set
 unless the existing value is equal to defaultValue.

 Property keys must be <code>NSString</code> objects and values must be
 <code>NSString</code>, <code>NSNumber</code>, <code>NSNull</code>,
 <code>NSArray</code>, <code>NSDictionary</code>, <code>NSDate</code> or
 <code>NSURL</code> objects.

 @param properties      properties dictionary
 @param defaultValue    overwrite existing properties that have this value
 */
- (void)registerSuperPropertiesOnce:(NSDictionary *)properties defaultValue:(nullable id)defaultValue;

/*!
 Removes a previously registered super property.

 As an alternative to clearing all properties, unregistering specific super
 properties prevents them from being recorded on future events. This operation
 does not affect the value of other super properties. Any property name that is
 not registered is ignored.

 Note that after removing a super property, events will show the attribute as
 having the value <code>undefined</code> in Mixpanel until a new value is
 registered.

 @param propertyName   array of property name strings to remove
 */
- (void)unregisterSuperProperty:(NSString *)propertyName;

/*!
 Clears all currently set super properties.
 */
- (void)clearSuperProperties;

/*!
 Returns the currently set super properties.
 */
- (NSDictionary *)currentSuperProperties;

/*!
 Starts a timer that will be stopped and added as a property when a
 corresponding event is tracked.

 This method is intended to be used in advance of events that have
 a duration. For example, if a developer were to track an "Image Upload" event
 she might want to also know how long the upload took. Calling this method
 before the upload code would implicitly cause the <code>track</code>
 call to record its duration.

 <pre>
 // begin timing the image upload
 [mixpanel timeEvent:@"Image Upload"];

 // upload the image
 [self uploadImageWithSuccessHandler:^{

    // track the event
    [mixpanel track:@"Image Upload"];
 }];
 </pre>

 @param event   a string, identical to the name of the event that will be tracked

 */
- (void)timeEvent:(NSString *)event;

/*!
 Retrieves the time elapsed for the named event since <code>timeEvent:</code> was called.

 @param event   the name of the event to be tracked that was passed to <code>timeEvent:</code>
 */
- (double)eventElapsedTime:(NSString *)event;

/*!
 Clears all current event timers.
 */
- (void)clearTimedEvents;

/*!
 Clears all stored properties and distinct IDs. Useful if your app's user logs out.
 */
- (void)reset;

/*!
 Uploads queued data to the Mixpanel server.

 By default, queued data is flushed to the Mixpanel servers every minute (the
 default for <code>flushInterval</code>), and on background (since
 <code>flushOnBackground</code> is on by default). You only need to call this
 method manually if you want to force a flush at a particular moment.
 */
- (void)flush;

/*!
 Calls flush, then optionally archives and calls a handler when finished.

 When calling <code>flush</code> manually, it is sometimes important to verify
 that the flush has finished before further action is taken. This is
 especially important when the app is in the background and could be suspended
 at any time if protocol is not followed. Delegate methods like
 <code>application:didReceiveRemoteNotification:fetchCompletionHandler:</code>
 are called when an app is brought to the background and require a handler to
 be called when it finishes.

 @param handler     completion handler to be called after flush completes
 */
- (void)flushWithCompletion:(nullable void (^)(void))handler;

/*!
 Writes current project info, including distinct ID, super properties and pending event
 and People record queues to disk.

 This state will be recovered when the app is launched again if the Mixpanel
 library is initialized with the same project token. <b>You do not need to call
 this method</b>. The library listens for app state changes and handles
 persisting data as needed. It can be useful in some special circumstances,
 though, for example, if you'd like to track app crashes from main.m.
 */
- (void)archive;

/*!
 Creates a distinct_id alias from alias to original id.

 This method is used to map an identifier called an alias to the existing Mixpanel
 distinct id. This causes all events and people requests sent with the alias to be
 mapped back to the original distinct id. The recommended usage pattern is to call
 createAlias: and then identify: (with their new user ID) when they log in the next time.
 This will keep your signup funnels working correctly.

 <pre>
 // This makes the current ID (an auto-generated GUID)
 // and 'Alias' interchangeable distinct ids.
 [mixpanel createAlias:@"Alias"
    forDistinctID:mixpanel.distinctId];

 // You must call identify if you haven't already
 // (e.g., when your app launches).
 [mixpanel identify:mixpanel.distinctId];
</pre>

@param alias 		the new distinct_id that should represent original
@param distinctID 	the old distinct_id that alias will be mapped to
 */
- (void)createAlias:(NSString *)alias forDistinctID:(NSString *)distinctID;

/*!
 Creates a distinct_id alias from alias to original id.

 This method is not intended to be used unless you wish to prevent updating the Mixpanel
 People distinct ID value by passing a value of NO to the usePeople param. This can be
 useful if the user wishes to prevent People updates from being sent until the identify
 method is called.

 @param alias         the new distinct_id that should represent original
 @param distinctID     the old distinct_id that alias will be mapped to
 @param usePeople bool controls whether or not to set the people distinctId to the event distinctId
 */
- (void)createAlias:(NSString *)alias forDistinctID:(NSString *)distinctID usePeople:(BOOL)usePeople;

/*!
 Returns the Mixpanel library version number as a string, e.g. "3.2.3".
 */
- (NSString *)libVersion;

/*!
 Opt out tracking.

 This method is used to opt out tracking. This causes all events and people request no longer
 to be sent back to the Mixpanel server.
 */
- (void)optOutTracking;

/*!
 Opt in tracking.

 Use this method to opt in an already opted out user from tracking. People updates and track calls will be
 sent to Mixpanel after using this method.

 This method will internally track an opt in event to your project. If you want to identify the opt-in
 event and/or pass properties to the event, See also <code>optInTrackingForDistinctId:</code> and
 <code>optInTrackingForDistinctId:withEventProperties:</code>.
 */
- (void)optInTracking;

/*!
 Opt in tracking.

 Use this method to opt in an already opted out user from tracking. People updates and track calls will be
 sent to Mixpanel after using this method.

 This method will internally track an opt in event to your project. If you want to pass properties to the event, see also
 <code>optInTrackingForDistinctId:withEventProperties:</code>.

 @param distinctID     optional string to use as the distinct ID for events. This will call <code>identify:</code>.
 If you use people profiles make sure you manually call <code>identify:</code> after this method.
 */
- (void)optInTrackingForDistinctID:(nullable NSString *)distinctID;

/*!
 Opt in tracking.

 Use this method to opt in an already opted out user from tracking. People updates and track calls will be
 sent to Mixpanel after using this method.

 This method will internally track an opt in event to your project.See also <code>optInTracking</code> or
 <code>optInTrackingForDistinctId:</code>.

 @param distinctID     optional string to use as the distinct ID for events. This will call <code>identify:</code>.
 If you use people profiles make sure you manually call <code>identify:</code> after this method.
 @param properties     optional properties dictionary that could be passed to add properties to the opt-in event that is sent to
 Mixpanel.
 */
- (void)optInTrackingForDistinctID:(nullable NSString *)distinctID withEventProperties:(nullable NSDictionary *)properties;

/*!
 Returns YES if the current user has opted out tracking, NO if the current user has opted in tracking.
 */
- (BOOL)hasOptedOutTracking;

/*!
 Returns the Mixpanel library version number as a string, e.g. "3.2.3".
 */
+ (NSString *)libVersion;


#if !MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT
#pragma mark - Mixpanel Notifications

/*!
 Shows the notification of the given id.

 You do not need to call this method on the main thread.

 @param ID      notification id
 */
- (void)showNotificationWithID:(NSUInteger)ID;


/*!
 Shows a notification with the given type if one is available.

 You do not need to call this method on the main thread.

 @param type The type of notification to show, either @"mini", or @"takeover"
 */
- (void)showNotificationWithType:(NSString *)type;

/*!
 Shows a notification if one is available.

 You do not need to call this method on the main thread.
 */
- (void)showNotification;

#pragma mark - Mixpanel A/B Testing

/*!
 Join any experiments (A/B tests) that are available for the current user.

 Mixpanel will check for A/B tests automatically when your app enters
 the foreground. Call this method if you would like to to check for,
 and join, any experiments are newly available for the current user.

 You do not need to call this method on the main thread.
 */
- (void)joinExperiments;

/*!
 Join any experiments (A/B tests) that are available for the current user.

 Same as joinExperiments but will fire the given callback after all experiments
 have been loaded and applied.

 @param experimentsLoadedCallback       callback to be called after experiments
                                        joined and applied
 */
- (void)joinExperimentsWithCallback:(nullable void (^)(void))experimentsLoadedCallback;

#endif // MIXPANEL_NO_NOTIFICATION_AB_TEST_SUPPORT

#pragma mark - Deprecated
/*!
 Current user's name in Mixpanel Streams.
 */
@property (nullable, atomic, copy) NSString *nameTag __deprecated; // Deprecated in v3.0.1

@end

/*!
 @protocol

 Delegate protocol for controlling the Mixpanel API's network behavior.

 Creating a delegate for the Mixpanel object is entirely optional. It is only
 necessary when you want full control over when data is uploaded to the server,
 beyond simply calling stop: and start: before and after a particular block of
 your code.
 */

@protocol MixpanelDelegate <NSObject>

@optional
/*!
 Asks the delegate if data should be uploaded to the server.

 Return YES to upload now, NO to defer until later.

 @param mixpanel        Mixpanel API instance
 */
- (BOOL)mixpanelWillFlush:(Mixpanel *)mixpanel;

@end

NS_ASSUME_NONNULL_END
