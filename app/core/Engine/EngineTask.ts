import Realm from 'realm';

/**
 * Generic schema for persisting any controller state
 * Replaces FileSystemStorage key-value approach with Realm storage
 */
export class PersistedState extends Realm.Object<PersistedState> {
  key!: string;        // "persist:TransactionController", "persist:KeyringController", etc.
  data!: any;        // The actual controller state as JSON-serializable data
  updatedAt!: Date;    // When this controller state was last updated
  version!: number;    // Schema version for future migrations

  static schema: Realm.ObjectSchema = {
    name: 'PersistedState',
    primaryKey: 'key',
    properties: {
      key: 'string',
      data: 'mixed',
      updatedAt: 'date',
      version: { type: 'int', default: 1 },
    },
  };
}

// Keep the old Controller for backward compatibility during transition
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
