/**
 * Common Detox element types for e2e tests
 * Import these types instead of repeating them in each file
 */

export type DetoxElement = Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement>;
export type TappableElement = Promise<Detox.IndexableNativeElement | Detox.SystemElement>;
export type TypableElement = Promise<Detox.IndexableNativeElement>; 