import Realm from 'realm';

/**
 * Simple Controller object schema for Realm database
 */
export class Controller extends Realm.Object<Controller> {
  key!: string;
  value!: string;
  isActive!: boolean;

  static schema: Realm.ObjectSchema = {
    name: 'Controller',
    primaryKey: 'key',
    properties: {
      key: 'string',
      value: 'string',
      isActive: { type: 'bool', default: true },
    },
  };
}
