import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import Engine from '../Engine';

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
  static #navigation: NavigationContainerRef<ParamListBase>;

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
  static #assertNavigationRefType(
    navRef: NavigationContainerRef<ParamListBase>,
  ) {
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
    navRef: NavigationContainerRef<ParamListBase>,
  ): NavigationContainerRef<ParamListBase> {
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
  static set navigation(navRef: NavigationContainerRef<ParamListBase>) {
    this.#assertNavigationRefType(navRef);
    this.#navigation = this.#createReactAwareNavigation(navRef);

    // Agentic bridge — exposes navigation primitives and account helpers on
    // globalThis so that AI coding agents (Claude Code, Cursor, etc.) can
    // inspect and drive the app remotely via Metro's Hermes CDP WebSocket.
    // The bridge is consumed by the scripts in `scripts/perps/agentic/`.
    //
    // Why NavigationService? It is the single guaranteed init point that runs
    // once the navigation container is ready, making it the natural place to
    // install any __DEV__ globals that need a live app reference (nav + Engine).
    // Account helpers (listAccounts, switchAccount) live here rather than in a
    // separate file to avoid an extra module boundary in __DEV__-only code.
    //
    // __DEV__ only — completely stripped from production builds by Metro/Babel.
    // See docs/perps/perps-agentic-feedback-loop.md for the full workflow.
    if (__DEV__) {
      Logger.log('[NavigationService] __AGENTIC__ bridge installed');
      // Use this.#navigation (the deferred-wrapped proxy) so navigate/goBack
      // honour the requestAnimationFrame deferral, matching production behaviour.
      const deferredNav = this.#navigation;
      (globalThis as Record<string, unknown>).__AGENTIC__ = {
        platform: Platform.OS,
        navigate: (name: string, params?: object) =>
          (
            deferredNav.navigate as unknown as (
              name: string,
              params?: object,
            ) => void
          )(name, params),
        getRoute: () => navRef.getCurrentRoute(),
        getState: () => navRef.getState(),
        canGoBack: () => navRef.canGoBack(),
        goBack: () => deferredNav.goBack(),
        listAccounts: () => {
          const ctrl = Engine.context.AccountsController;
          return ctrl
            .listAccounts()
            .map(
              (a: {
                id: string;
                address: string;
                metadata: { name: string };
              }) => ({
                id: a.id,
                address: a.address,
                name: a.metadata.name,
              }),
            );
        },
        getSelectedAccount: () => {
          const ctrl = Engine.context.AccountsController;
          const a = ctrl.getSelectedAccount();
          return { id: a.id, address: a.address, name: a.metadata.name };
        },
        switchAccount: (address: string) => {
          const ctrl = Engine.context.AccountsController;
          const accounts = ctrl.listAccounts();
          const target = accounts.find(
            (a: { address: string }) =>
              a.address.toLowerCase() === address.toLowerCase(),
          );
          if (!target) {
            throw new Error(`No account found for address ${address}`);
          }
          // Use Engine.setSelectedAddress to sync both AccountsController
          // and PreferencesController (not AccountsController.setSelectedAccount directly).
          Engine.setSelectedAddress(target.address);
          return {
            switched: true,
            id: target.id,
            address: target.address,
            name: target.metadata.name,
          };
        },
      };
      try {
        (globalThis as Record<string, unknown>).store = ReduxService.store;
      } catch {
        // ReduxService.store may not be initialized yet (e.g. in tests); skip.
      }
      (globalThis as Record<string, unknown>).Engine = Engine;
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
    this.#navigation =
      undefined as unknown as NavigationContainerRef<ParamListBase>;
  }
}

export default NavigationService;
