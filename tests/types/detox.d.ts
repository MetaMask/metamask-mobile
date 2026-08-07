/**
 * Ambient Detox-shaped types kept for dual-framework page objects until Phase 3
 * Element API codemod (MMQA-2230). Runtime Detox package is removed.
 */

declare namespace Detox {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type IndexableNativeElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NativeElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type IndexableSystemElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type SystemElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type IndexableWebElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type WebViewElement = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NativeMatcher = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DeviceLaunchAppConfig = any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SecuredWebElementFacade = any;

declare global {
  type DetoxElement = Promise<
    | Detox.IndexableNativeElement
    | Detox.NativeElement
    | Detox.IndexableSystemElement
  >;
  type TappableElement = Promise<
    Detox.IndexableNativeElement | Detox.SystemElement
  >;
  type TypableElement = Promise<Detox.IndexableNativeElement>;
  type WebElement = Promise<
    Detox.IndexableWebElement | SecuredWebElementFacade
  >;
  type IndexableNativeElement = Detox.IndexableNativeElement;
  type IndexableWebElement = Detox.IndexableWebElement;
  type NativeElement = Detox.NativeElement;
  type SystemElement = Detox.SystemElement;
  type DeviceLaunchAppConfig = Detox.DeviceLaunchAppConfig;
  type DetoxMatcher = Detox.NativeMatcher;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const device: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const by: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waitFor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const web: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const system: any;
}

export {};
