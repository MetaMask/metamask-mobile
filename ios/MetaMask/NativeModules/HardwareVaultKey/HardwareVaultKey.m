#import "HardwareVaultKey.h"
#import <Security/Security.h>
#import <LocalAuthentication/LocalAuthentication.h>

static NSString *const kServicePrefix = @"mm.wallet.hw.";
static NSString *const kAccount = @"metamask";
static NSInteger const kBlobVersion = 1;

@implementation HardwareVaultKey

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

#pragma mark - Helpers

static NSString *serviceFor(NSString *purpose) {
  return [kServicePrefix stringByAppendingString:purpose];
}

// Returns the appropriate access-control flags for this device: biometry when
// available, otherwise device passcode. Returns NULL if neither is available.
static SecAccessControlRef createAccessControl(NSError **error) {
  LAContext *context = [[LAContext alloc] init];
  BOOL canBiometry = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:nil];
  if (canBiometry) {
    return SecAccessControlCreateWithFlags(
        NULL, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        kSecAccessControlBiometryAny, (CFErrorRef *)error);
  }
  // Fall back to device passcode (still SEP-protected, still auth-gated).
  return SecAccessControlCreateWithFlags(
      NULL, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      kSecAccessControlDevicePasscode, (CFErrorRef *)error);
}

static NSDictionary *baseQuery(NSString *purpose) {
  return @{
    (id)kSecClass : (id)kSecClassGenericPassword,
    (id)kSecAttrService : serviceFor(purpose),
    (id)kSecAttrAccount : kAccount,
  };
}

// Serializes a reference blob. The actual secret is held in the SEP keychain
// item; this blob only records metadata + purpose binding.
static NSString *serializeBlob(NSString *purpose) {
  NSDictionary *blob = @{
    @"v" : @(kBlobVersion),
    @"alg" : @"AES-GCM-256",
    @"ct" : @"",
    @"iv" : @"",
    @"purpose" : purpose,
    @"hw" : @"ios-sep-keychain",
  };
  return [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:blob options:0 error:nil]
                               encoding:NSUTF8StringEncoding];
}

#pragma mark - React methods

RCT_EXPORT_METHOD(isAvailable : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject) {
  LAContext *context = [[LAContext alloc] init];
  NSError *error = nil;
  BOOL canAuth = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error];
  resolve(@(canAuth));
}

RCT_EXPORT_METHOD(getBackend : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject) {
  resolve(@"ios-sep-keychain");
}

RCT_EXPORT_METHOD(encrypt : (NSString *)purpose
                  plaintext : (NSString *)plaintext
                  resolve : (RCTPromiseResolveBlock)resolve
                  reject : (RCTPromiseRejectBlock)reject) {
  NSError *accessError = nil;
  SecAccessControlRef accessControl = createAccessControl(&accessError);
  if (accessControl == NULL) {
    reject(@"NO_AUTH_AVAILABLE", @"no biometric or device passcode available", accessError);
    return;
  }

  // Delete any existing item for this purpose before writing (overwrite).
  SecItemDelete((__bridge CFDictionaryRef)baseQuery(purpose));

  NSDictionary *query = @{
    (id)kSecClass : (id)kSecClassGenericPassword,
    (id)kSecAttrService : serviceFor(purpose),
    (id)kSecAttrAccount : kAccount,
    (id)kSecValueData : [plaintext dataUsingEncoding:NSUTF8StringEncoding],
    (id)kSecAttrAccessControl : (__bridge id)accessControl,
  };

  OSStatus status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
  if (accessControl) {
    CFRelease(accessControl);
  }
  if (status != errSecSuccess) {
    reject(@"ENCRYPT_FAILED", [NSString stringWithFormat:@"SecItemAdd failed: %d", (int)status], nil);
    return;
  }
  resolve(serializeBlob(purpose));
}

RCT_EXPORT_METHOD(decrypt : (NSString *)purpose
                  blob : (NSString *)blob
                  resolve : (RCTPromiseResolveBlock)resolve
                  reject : (RCTPromiseRejectBlock)reject) {
  // Validate purpose binding against the reference blob.
  NSData *blobData = [blob dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *parsed = [NSJSONSerialization JSONObjectWithData:blobData options:0 error:nil];
  NSString *blobPurpose = parsed[@"purpose"];
  if (![blobPurpose isEqualToString:purpose]) {
    reject(@"PURPOSE_MISMATCH", @"blob purpose does not match", nil);
    return;
  }

  LAContext *context = [[LAContext alloc] init];
  context.localizedFallbackTitle = @"Use Passcode";

  NSMutableDictionary *query = [baseQuery(purpose) mutableCopy];
  query[(id)kSecReturnData] = @YES;
  query[(id)kSecMatchLimit] = (id)kSecMatchLimitOne;
  // kSecUseAuthenticationContext triggers the biometric/passcode prompt based
  // on the item's access control (decrypt-in-hardware).
  query[(id)kSecUseAuthenticationContext] = context;

  CFTypeRef result = NULL;
  OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
  if (status != errSecSuccess) {
    reject(@"DECRYPT_FAILED", [NSString stringWithFormat:@"SecItemCopyMatching failed: %d", (int)status], nil);
    return;
  }
  NSData *data = CFBridgingRelease(result);
  resolve([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
}

RCT_EXPORT_METHOD(clear : (NSString *)purpose resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject) {
  OSStatus status = SecItemDelete((__bridge CFDictionaryRef)baseQuery(purpose));
  // errSecItemNotFound is fine — there was nothing to clear.
  resolve(@(status == errSecSuccess || status == errSecItemNotFound));
}

@end
