import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import Logger from '../../util/Logger';
import type { RootParamList } from '../../types/navigation.d';

/**
 * Navigate options for v7 compatibility
 */
interface NavigateOptions {
  name: string;
  params?: object;
  pop?: boolean;
}

/**
 * A wrapper around the navigation object that adds pop: true by default.
 * This restores React Navigation v6 behavior where navigate() goes back
 * to existing screens instead of pushing new ones.
 */
class WrappedNavigation {
  #navRef: NavigationContainerRef<RootParamList>;

  constructor(navRef: NavigationContainerRef<RootParamList>) {
    this.#navRef = navRef;
  }

  /**
   * Navigate to a screen with pop: true by default (v6 behavior).
   * In v7, navigate() always pushes new screens. This wrapper restores
   * the old behavior where navigating to an existing screen goes back to it.
   *
   * @example
   * ```typescript
   * // Goes back to WalletView if it exists (v6 behavior)
   * NavigationService.navigation.navigate('WalletView');
   *
   * // Explicitly push a new screen (v7 behavior)
   * NavigationService.navigation.navigate({ name: 'Screen', pop: false });
   * ```
   */
  navigate(nameOrOptions: string | NavigateOptions, params?: object) {
    if (typeof nameOrOptions === 'string') {
      // String form: navigate('ScreenName', params)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.#navRef.navigate as (options: never) => void)({
        name: nameOrOptions,
        params,
        pop: true,
      } as never);
      return;
    }
    // Object form: navigate({ name, params, pop })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.#navRef.navigate as (options: never) => void)({
      ...nameOrOptions,
      pop: nameOrOptions.pop ?? true,
    } as never);
  }

  /**
   * Go back one screen in the stack
   */
  goBack() {
    if (this.#navRef.canGoBack()) {
      this.#navRef.goBack();
    }
  }

  /**
   * Check if we can go back
   */
  canGoBack() {
    return this.#navRef.canGoBack();
  }

  /**
   * Pop to the top of the stack
   */
  popToTop() {
    this.#navRef.dispatch(StackActions.popToTop());
  }

  /**
   * Pop n screens from the stack
   */
  pop(count = 1) {
    this.#navRef.dispatch(StackActions.pop(count));
  }

  /**
   * Dispatch a navigation action directly
   */
  dispatch(
    action: Parameters<NavigationContainerRef<RootParamList>['dispatch']>[0],
  ) {
    return this.#navRef.dispatch(action);
  }

  /**
   * Get current route state
   */
  getCurrentRoute() {
    return this.#navRef.getCurrentRoute();
  }

  /**
   * Get root state
   */
  getRootState() {
    return this.#navRef.getRootState();
  }

  /**
   * Get current navigation state
   */
  getState() {
    return this.#navRef.getState();
  }

  /**
   * Check if navigation is ready
   */
  isReady() {
    return this.#navRef.isReady();
  }

  /**
   * Reset navigation state
   */
  reset(state: Parameters<NavigationContainerRef<RootParamList>['reset']>[0]) {
    return this.#navRef.reset(state);
  }

  /**
   * Set params for current screen
   */
  setParams(params: object) {
    return this.#navRef.setParams(params);
  }
}

/**
 * Navigation service that manages the navigation object.
 *
 * In React Navigation v7, navigate() always pushes new screens by default.
 * This service wraps the navigation object to add pop: true by default,
 * restoring v6 behavior where navigating to an existing screen goes back to it.
 */
class NavigationService {
  static #navigation: NavigationContainerRef<RootParamList>;
  static #wrappedNavigation: WrappedNavigation;

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
    navRef: NavigationContainerRef<RootParamList>,
  ) {
    if (typeof navRef?.navigate !== 'function') {
      const error = new Error('Navigation reference is not valid!');
      Logger.error(error);
      throw error;
    }
    return this.#navigation;
  }

  /**
   * Set the navigation object
   * @param navRef
   */
  static set navigation(navRef: NavigationContainerRef<RootParamList>) {
    this.#assertNavigationRefType(navRef);
    this.#navigation = navRef;
    this.#wrappedNavigation = new WrappedNavigation(navRef);
  }

  /**
   * Get the wrapped navigation object with pop: true default behavior.
   * Use this for navigating with v6-like behavior.
   */
  static get navigation(): WrappedNavigation {
    this.#assertNavigationExists();
    return this.#wrappedNavigation;
  }
}

export default NavigationService;
export { WrappedNavigation };
