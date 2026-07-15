/**
 * Global Detox types for e2e tests
 * These types are automatically available in all e2e files without imports
 */

declare global {
  // Common element types
  type DetoxElement = Promise<
    | Detox.IndexableNativeElement
    | Detox.NativeElement
    | Detox.IndexableSystemElement
  >;
  type TappableElement = Promise<
    Detox.IndexableNativeElement | Detox.SystemElement
  >;
  type TypableElement = Promise<Detox.IndexableNativeElement>;

  // Web element types
  type WebElement = Promise<IndexableWebElement | SecuredWebElementFacade>;

  // Individual element types - useful for specific casting
  type IndexableNativeElement = Detox.IndexableNativeElement;
  type IndexableWebElement = Detox.IndexableWebElement;
  type NativeElement = Detox.NativeElement;
  type SystemElement = Detox.SystemElement;

  // Configuration types
  type DeviceLaunchAppConfig = Detox.DeviceLaunchAppConfig;

  // Matcher types for element finding
  type DetoxMatcher = Detox.NativeMatcher;
}

// This export is required to make this file a module
export {};
