import { NavigationContainerRef } from '@react-navigation/native';
import Logger from '../../util/Logger';

/**
 * Navigation service that manages the navigation object
 */
class NavigationService {
  static #navigation: NavigationContainerRef<any>;

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
  static #assertNavigationRefType(navRef: NavigationContainerRef<any>) {
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
  static set navigation(navRef: NavigationContainerRef<any>) {
    this.#assertNavigationRefType(navRef);
    this.#navigation = navRef;
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
