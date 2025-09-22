import Realm from 'realm';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { PersistedState } from '../../core/Engine/EngineTask';
import Logger from '../../util/Logger';

// Singleton Realm instance to avoid "different schema mode" error
class RealmSingleton {
  private static instance: Realm | null = null;

  static getInstance(): Realm {
    if (!RealmSingleton.instance || RealmSingleton.instance.isClosed) {
      try {
        const realmPath = 'metamask-engine.realm';
        RealmSingleton.instance = new Realm({
          schema: [PersistedState],
          path: realmPath,
          schemaVersion: 4,
        });

        // 🔒 CRITICAL SECURITY: Exclude Realm file from iCloud backup
        if (Platform.OS === 'ios') {
          try {
            const fullRealmPath = RealmSingleton.instance.path;
            ReactNativeBlobUtil.ios.excludeFromBackupKey(fullRealmPath);
          } catch (backupError) {
            Logger.error(backupError as Error, {
              message: 'Critical security issue: Failed to exclude Realm file from iCloud backup',
              realmPath: RealmSingleton.instance.path,
            });
          }
        }
      } catch (error) {
        throw error;
      }
    }
    return RealmSingleton.instance;
  }

  static close(): void {
    if (RealmSingleton.instance && !RealmSingleton.instance.isClosed) {
      RealmSingleton.instance.close();
      RealmSingleton.instance = null;
    }
  }
}

const getRealmInstance = (): Realm => RealmSingleton.getInstance();

const KeyTransformUtils = {
  encodeObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.encodeObjectKeys(item));
    }

    const transformedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Use Base64 encoding for keys with problematic characters
      // This prevents collisions with real URLs that might contain our replacement strings
      const safeKey = this.hasProblematicChars(key)
        ? `__B64__${Buffer.from(key).toString('base64')}__END__`
        : key;

      transformedObj[safeKey] = this.encodeObjectKeys(value);
    }

    return transformedObj;
  },

  // Restore original keys when reading from Realm
  decodeObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.decodeObjectKeys(item));
    }

    const originalObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const originalKey = key.startsWith('__B64__') && key.endsWith('__END__')
        ? Buffer.from(key.slice(7, -7), 'base64').toString('utf8')
        : key;

      originalObj[originalKey] = this.decodeObjectKeys(value);
    }

    return originalObj;
  },

  // Check if key contains characters problematic for Realm
  hasProblematicChars(key: string): boolean {
    return /[.:\/@]/.test(key);
  },

  // Check if object has problematic keys that need transformation
  hasProblematicKeys(obj: any): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (Array.isArray(obj)) {
      return obj.some(item => this.hasProblematicKeys(item));
    }

    for (const [key, value] of Object.entries(obj)) {
      // Check for problematic characters in keys
      if (this.hasProblematicChars(key)) {
        return true;
      }

      // Check nested objects recursively
      if (this.hasProblematicKeys(value)) {
        return true;
      }
    }

    return false;
  }
};

const RealmPersistentStorage = {
  async getItem(key: string): Promise<any> {
    try {
      const realm = getRealmInstance();
      const persistedItem = realm.objectForPrimaryKey('PersistedState', key);

      if (persistedItem) {
        const itemData = (persistedItem as any).data;

        // Convert managed Realm object to plain object first
        let plainObject: any;
        if (typeof itemData === 'object' && itemData !== null) {
          plainObject = JSON.parse(JSON.stringify(itemData));

          // Check if this was a transformed object and decode if needed
          if (key === 'persist:PermissionController' || key === 'persist:SnapController') {
            const decodedObject = KeyTransformUtils.decodeObjectKeys(plainObject);
            return decodedObject;
          }

          return plainObject;
        } else {
          // Handle primitives (strings, numbers, booleans)
          return itemData;
        }
      } else {
        return null;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get persisted item with key ${key}`,
      });
      return null;
    }
  },

  async setItem(key: string, value: any): Promise<void> {
    try {
      const realm = getRealmInstance();

      // Parse string values to objects first if possible
      let objectValue: any = value;
      if (typeof value === 'string') {
        try {
          objectValue = JSON.parse(value);
        } catch (parseError) {
          objectValue = value; // Keep as string primitive
        }
      }

      let dataToStore: any;

      // Handle objects with potential key transformation
      if (typeof objectValue === 'object' && objectValue !== null) {
        // Check for problematic controllers and apply key transformation
        if ((key === 'persist:PermissionController' || key === 'persist:SnapController') &&
          KeyTransformUtils.hasProblematicKeys(objectValue)) {
          dataToStore = KeyTransformUtils.encodeObjectKeys(objectValue);
        } else {
          dataToStore = objectValue;
        }
      } else {
        dataToStore = objectValue;
      }

      realm.write(() => {
        realm.create('PersistedState', {
          key,
          data: dataToStore,
          updatedAt: new Date(),
          version: 1,
        }, Realm.UpdateMode.Modified);
      });
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set persisted item with key ${key}`,
      });
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const realm = getRealmInstance();
      const persistedItem = realm.objectForPrimaryKey('PersistedState', key);

      if (persistedItem) {
        realm.write(() => {
          realm.delete(persistedItem);
        });
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove persisted item with key ${key}`,
      });
      throw error;
    }
  },

  async getAllControllerKeys(): Promise<string[]> {
    try {
      const realm = getRealmInstance();
      const allPersistedItems = realm.objects('PersistedState');

      // Filter for controller keys (those starting with "persist:")
      const controllerKeys = Array.from(allPersistedItems)
        .map(item => (item as any).key as string)
        .filter(key => key.startsWith('persist:'));

      return controllerKeys;
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Failed to get all controller keys',
      });
      return [];
    }
  }
};

// Export for external access
export { RealmSingleton, getRealmInstance, RealmPersistentStorage };