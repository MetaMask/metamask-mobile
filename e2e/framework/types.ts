// Gestures

export interface GestureOptions {
  timeout?: number;
  checkStability?: boolean;
  checkVisibility?: boolean;
  checkEnabled?: boolean;
  elemDescription?: string; // For better error messages - i.e "Get Started button"
}

export interface TapOptions extends GestureOptions {}

export interface TypeTextOptions extends GestureOptions {
  clearFirst?: boolean;
  hideKeyboard?: boolean;
  sensitive?: boolean; // If true, the text will not be logged in the test report
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

export interface RetryOptions {
  timeout?: number;
  interval?: number;
  description?: string; // Description for the retry operation, e.g. "tap() or "waitForReadyState()"
  elemDescription?: string;
  maxRetries?: number;
}

export interface StabilityOptions {
  timeout?: number;
  interval?: number;
  stableCount?: number;
}
