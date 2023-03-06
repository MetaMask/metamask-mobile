//
//  MPNetworkPrivate.h
//  Mixpanel
//
//  Created by Sam Green on 6/17/16.
//  Copyright © 2016 Mixpanel. All rights reserved.
//

#import "MPNetwork.h"

@interface MPNetwork ()

@property (nonatomic, weak) Mixpanel *mixpanel;
@property (nonatomic, strong) NSURL *serverURL;

@property (nonatomic) NSTimeInterval requestsDisabledUntilTime;
@property (nonatomic) NSUInteger consecutiveFailures;

- (BOOL)handleNetworkResponse:(NSHTTPURLResponse *)response withError:(NSError *)error;

+ (NSTimeInterval)calculateBackOffTimeFromFailures:(NSUInteger)failureCount;
+ (NSTimeInterval)parseRetryAfterTime:(NSHTTPURLResponse *)response;
+ (BOOL)parseHTTPFailure:(NSHTTPURLResponse *)response withError:(NSError *)error;

+ (NSString *)encodeArrayForAPI:(NSArray *)array;
+ (NSData *)encodeArrayAsJSONData:(NSArray *)array;
+ (NSString *)encodeJSONDataAsBase64:(NSData *)data;

+ (NSArray<NSURLQueryItem *> *)buildDecideQueryForProperties:(NSDictionary *)properties
                                              withDistinctID:(NSString *)distinctID
                                                    andToken:(NSString *)token;

- (NSURLRequest *)buildRequestForEndpoint:(NSString *)endpoint
                             byHTTPMethod:(NSString *)method
                           withQueryItems:(NSArray <NSURLQueryItem *> *)queryItems
                                  andBody:(NSString *)body;

+ (NSURLSession *)sharedURLSession;

@end
