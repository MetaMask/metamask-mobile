/**
 * Global Detox element types for e2e tests
 * These types are automatically available in all e2e files without imports
 */

declare global {
  type DetoxElement = Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement>;
  type TappableElement = Promise<Detox.IndexableNativeElement | Detox.SystemElement>;
  type TypableElement = Promise<Detox.IndexableNativeElement>;
}

// This export is required to make this file a module
export {}; 