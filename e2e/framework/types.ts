
// Gestures

export interface GestureOptions {
  timeout?: number;
  checkStability?: boolean;
  skipVisibilityCheck?: boolean;
  description?: string;
}

export interface TapOptions extends GestureOptions {
  elemDescription?: string; // For better error messages - i.e "Get Started button"
}

export interface TypeTextOptions extends GestureOptions {
  clearFirst?: boolean;
  hideKeyboard?: boolean;
}

export interface SwipeOptions extends GestureOptions {
  speed?: 'fast' | 'slow';
  percentage?: number;
}

export interface LongPressOptions extends GestureOptions {
  duration?: number;
}

export interface ScrollOptions extends GestureOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  scrollAmount?: number;
}

// Assertions

export interface AssertionOptions extends RetryOptions {
  timeout?: number;
  description?: string; // Description for the assertion, e.g. "The Wallet View should be visible"
}

export interface ElementSelectorOptions {
  index?: number;
  exact?: boolean;
}


export interface RetryOptions {
  timeout?: number;
  interval?: number;
  description?: string;
  elemDescription?: string;
  maxRetries?: number;
}

export interface StabilityOptions {
  timeout?: number;
  interval?: number;
  stableCount?: number;
}
