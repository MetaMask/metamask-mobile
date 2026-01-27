import { NavigationContainerRef } from '@react-navigation/native';
import Logger from '../../util/Logger';

/**
 * Navigation methods that should be deferred to the next frame.
 * This prevents timing issues when called during React's render cycle.
 *
 * - navigate: Navigate to a screen
 * - reset: Reset navigation state to a new state
 */
const DEFERRED_NAVIGATION_METHODS = [
  'navigate',
  'reset',
] as const;

/**
 * Navigation service that manages the navigation object.
 *
 * Navigation methods (navigate, reset) are
 * automatically deferred via requestAnimationFrame to prevent timing issues
 * when called during React's render cycle or navigation transitions.
 */
class NavigationService {
  static #navigation: NavigationContainerRef;

  /**
   * Checks that the navigation object exists
   */
  static #assertNavigationExists() {
    if (!this.#navigation) {
      const error = new Error('Navigation reference does not exist!');
      Logger.error(error);
      throw error;
    }
    return this.#navigation;
  }

  /**
   * Checks that the navigation object is valid
   */
  static #assertNavigationRefType(navRef: NavigationContainerRef) {
    if (typeof navRef?.navigate !== 'function') {
      const error = new Error('Navigation reference is not valid!');
      Logger.error(error);
      throw error;
    }
    return this.#navigation;
  }

  /**
   * Creates a wrapped navigation object that defers navigation methods
   * to the next frame to avoid timing issues during React's rendering cycles.
   */
  static #createReactAwareNavigation(
    navRef: NavigationContainerRef,
  ): NavigationContainerRef {
    return new Proxy(navRef, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // Check if this is a method that should be deferred
        if (
          typeof prop === 'string' &&
          DEFERRED_NAVIGATION_METHODS.includes(
            prop as (typeof DEFERRED_NAVIGATION_METHODS)[number],
          )
        ) {
          // Return a wrapped version that defers to the next frame
          return (...args: unknown[]) => {
            requestAnimationFrame(() => {
              (target[prop as keyof typeof target] as Function)(...args);
            });
          };
        }

        // For all other properties/methods, return the original
        // Bind functions to the original target to preserve `this` context
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      },
    });
  }

  /**
   * Set the navigation object
   * @param navRef
   */
  static set navigation(navRef: NavigationContainerRef) {
    this.#assertNavigationRefType(navRef);
    this.#navigation = this.#createReactAwareNavigation(navRef);
  }

  /**
   * Get the navigation object
   */
  static get navigation() {
    this.#assertNavigationExists();
    return this.#navigation;
  }
}

export default NavigationService;
