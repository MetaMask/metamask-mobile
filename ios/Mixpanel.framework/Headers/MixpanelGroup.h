//
//  MixpanelGroup.h
//  Mixpanel
//
//  Created by Weizhe Yuan on 8/16/18.
//  Copyright © 2018 Mixpanel. All rights reserved.
//
#import "Mixpanel.h"
#import <Foundation/Foundation.h>


NS_ASSUME_NONNULL_BEGIN

@interface MixpanelGroup : NSObject

/*!
 Set properties on this Mixpanel Group. Keys in properties must be NSString,
 and values are MixpanelTypes.

 The properties will be set on the current group. We use an NSAssert to enforce
 this type requirement. In release mode, the assert is stripped out and we will silently convert
 incorrect types to strings using [NSString stringWithFormat:@"%@", value].
 If the existing group record on the server already has a value for a given property,
 the old value is overwritten. Other existing properties will not be affected.

 @param properties       properties dictionary
 */
- (void)set:(NSDictionary *)properties;

/*!
 Set properties on this Mixpanel Group, but don't overwrite if
 there are existing values.

 This method is identical to set() except it will only set
 properties that are not already set.

 @param properties       properties dictionary
 */
- (void)setOnce:(NSDictionary *)properties;

/*!
 Remove a property and all its values from this Mixpanel Group. For
 properties that aren't set will be no effect.

 @param property        the property to be unset
 */
- (void)unset:(NSString *)property;

/*!
 Union list properties.

 Property keys must be <code>NSString</code> objects.

 @param property      mapping of list property names to lists to union
 */
- (void)union:(NSString *)property values:(NSArray<id<MixpanelType>> *)values;

/*!
 Permanently remove a group on server side.
 */
- (void)deleteGroup;

/*!
 Remove one value from a group property.

 @param property    the name of group property
 @param value       the value to be removed
 */
- (void)remove:(NSString *)property value:(id<MixpanelType>)value;

@end

NS_ASSUME_NONNULL_END
