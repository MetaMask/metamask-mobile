import Realm from 'realm';
import Logger from '../util/Logger';

class RealmService extends Realm {
  static #realmInstance: Realm;

  /**
   * Set the instance in the Realm class
   * @param realm
   */
  static set instance(realm: Realm) {
    this.#realmInstance = realm;
  }

  /**
   * Get the instance from the Realm class
   */
  static get instance() {
    if (!this.#realmInstance) {
      const error = new Error('Realm instance does not exist!');
      Logger.error(error);
      throw error;
    }
    return this.#realmInstance;
  }
}

export default RealmService;
