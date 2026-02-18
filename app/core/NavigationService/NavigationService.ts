import { NavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../redux';

/**
 * Navigation methods that should be deferred to the next frame.
 * This prevents timing issues when called during React's render cycle.
 *
 * - navigate: Navigate to a screen
 * - reset: Reset navigation state to a new state
 */
const DEFERRED_NAVIGATION_METHODS = ['navigate', 'reset'] as const;

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
              (
                target[prop as keyof typeof target] as (
                  ...params: unknown[]
                ) => void
              )(...args);
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

    // Agentic bridge — exposes navigation primitives on globalThis so that
    // AI coding agents (Claude Code, Cursor, etc.) can inspect and drive the
    // app remotely via Metro's Hermes CDP WebSocket. The bridge is consumed
    // by the scripts in `scripts/agentic/` (cdp-bridge.js).
    //
    // __DEV__ only — completely stripped from production builds.
    // See docs/perps/perps-agentic-feedback-loop.md for the full workflow.
    if (__DEV__) {
      Logger.log('[NavigationService] __AGENTIC__ bridge installed');
      (globalThis as Record<string, unknown>).__AGENTIC__ = {
        platform: Platform.OS,
        navigate: (name: string, params?: object) =>
          navRef.navigate(name as never, params as never),
        getRoute: () => navRef.getCurrentRoute(),
        getState: () => navRef.dangerouslyGetState(),
        canGoBack: () => navRef.canGoBack(),
        goBack: () => navRef.goBack(),
      };
      (globalThis as Record<string, unknown>).store = ReduxService.store;
    }
  }

  /**
   * Get the navigation object
   */
  static get navigation() {
    this.#assertNavigationExists();
    return this.#navigation;
  }

  /**
   * Resets the navigation reference. Only for testing purposes.
   * @internal
   */
  static resetForTesting() {
    this.#navigation = undefined as unknown as NavigationContainerRef;
  }
}

export default NavigationService;
