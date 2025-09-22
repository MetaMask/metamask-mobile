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

// 🧪 TEST UTILITY: Definitively determine if object is live Realm object
const RealmObjectTester = {
  isLiveRealmObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // Test 1: Check for Realm's isValid method (most reliable indicator)
    const hasIsValidMethod = typeof obj.isValid === 'function';
    
    // Test 2: Check constructor name (Realm uses Dictionary, List, etc.)
    const constructorName = obj.constructor?.name;
    const isRealmConstructor = constructorName && !['Object', 'Array'].includes(constructorName);
    
    // Test 3: Check for other Realm-specific methods
    const hasObjectSchemaMethod = typeof obj.objectSchema === 'function';
    const hasLinkingObjectsMethod = typeof obj.linkingObjects === 'function';
    
    // If any Realm-specific indicators are present, it's a live object
    const isLive = hasIsValidMethod || isRealmConstructor || hasObjectSchemaMethod || hasLinkingObjectsMethod;
    
    // Log test details for transparency
    console.log(`🧪 [REALM TESTER] hasIsValidMethod: ${hasIsValidMethod}`);
    console.log(`🧪 [REALM TESTER] constructorName: ${constructorName} (isRealmConstructor: ${isRealmConstructor})`);
    console.log(`🧪 [REALM TESTER] hasObjectSchemaMethod: ${hasObjectSchemaMethod}`);
    console.log(`🧪 [REALM TESTER] Final result: ${isLive ? 'LIVE REALM OBJECT' : 'PLAIN OBJECT'}`);
    
    return isLive;
  }
};

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

        // 🧪 COMPARISON TEST: Check both parent object and .data property
        const isParentLive = RealmObjectTester.isLiveRealmObject(persistedItem);
        const isDataLive = RealmObjectTester.isLiveRealmObject(itemData);
        
        console.log(`🧪 [PARENT TEST] persistedItem -> ${isParentLive ? '🔴 LIVE REALM OBJECT' : '🟢 PLAIN OBJECT'}`);
        console.log(`🧪 [DATA TEST] persistedItem.data -> ${isDataLive ? '🔴 LIVE REALM OBJECT' : '🟢 PLAIN OBJECT'}`);
        
        // 🔍 DEBUG: Detailed comparison
        console.log(`🔍 [PARENT DEBUG] persistedItem constructor: ${persistedItem?.constructor?.name}`);
        console.log(`🔍 [DATA DEBUG] itemData constructor: ${itemData?.constructor?.name}`);
        console.log(`🔍 [DATA DEBUG] itemData.isValid (if managed): ${itemData?.isValid?.()}`);
        console.log(`🔍 [DATA DEBUG] itemData keys: ${Object.keys(itemData || {}).slice(0, 5)}`);

        // Convert managed Realm object to plain object first
        let plainObject: any;
        if (typeof itemData === 'object' && itemData !== null) {
          // 🔍 DEBUG: Compare before and after conversion
          const beforeStringify = Date.now();
          const stringified = JSON.stringify(itemData);
          const afterStringify = Date.now();
          plainObject = JSON.parse(stringified);
          const afterParse = Date.now();
          
          console.log(`🔍 [REALM DEBUG] JSON.stringify took: ${afterStringify - beforeStringify}ms`);
          console.log(`🔍 [REALM DEBUG] JSON.parse took: ${afterParse - afterStringify}ms`);
          console.log(`🔍 [REALM DEBUG] Total conversion: ${afterParse - beforeStringify}ms`);
          
          // 🧪 TEST: Verify conversion worked - should now be plain object
          const isPlainAfterConversion = RealmObjectTester.isLiveRealmObject(plainObject);
          console.log(`🧪 [CONVERSION TEST] After JSON conversion -> ${isPlainAfterConversion ? '❌ STILL LIVE' : '✅ NOW PLAIN OBJECT'}`);

          // Check if this was a transformed object and decode if needed
          if (key === 'persist:PermissionController' || key === 'persist:SnapController') {
            const decodedObject = KeyTransformUtils.decodeObjectKeys(plainObject);
            
            // 🧪 FINAL TEST: Verify returned object is plain
            const isFinalObjectPlain = !RealmObjectTester.isLiveRealmObject(decodedObject);
            console.log(`🧪 [FINAL TEST] Decoded object -> ${isFinalObjectPlain ? '✅ PLAIN' : '❌ STILL LIVE'}`);
            
            return decodedObject;
          }

          // 🧪 FINAL TEST: Verify returned object is plain
          const isFinalObjectPlain = !RealmObjectTester.isLiveRealmObject(plainObject);
          console.log(`🧪 [FINAL TEST] Returned object -> ${isFinalObjectPlain ? '✅ PLAIN' : '❌ STILL LIVE'}`);

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