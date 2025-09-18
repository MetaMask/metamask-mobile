import Realm from 'realm';
import { Controller, PersistedState } from '../../core/Engine/EngineTask';
import Logger from '../../util/Logger';

console.log('🚀 [REALM DEBUG] realmInstance.ts module loading...');
console.log('🔧 [REALM DEBUG] Checking if Realm module is properly imported...');
console.log('📦 [REALM DEBUG] typeof Realm:', typeof Realm);

// Singleton Realm instance to avoid "different schema mode" error
class RealmSingleton {
  private static instance: Realm | null = null;

  static getInstance(): Realm {
    console.log('🗄️ [REALM DEBUG] getInstance() called');
    if (!RealmSingleton.instance || RealmSingleton.instance.isClosed) {
      console.log('🔧 [REALM DEBUG] Creating new Realm instance...');
      try {
        RealmSingleton.instance = new Realm({
          schema: [Controller, PersistedState],  // Include both schemas
          path: 'metamask-engine.realm',  // Use specific path to avoid conflicts
          schemaVersion: 2,  // Bump version due to schema addition
        });
        console.log('✅ [REALM DEBUG] Realm instance created successfully!');
      } catch (error) {
        console.log('❌ [REALM DEBUG] Failed to create Realm instance:', error);
        throw error;
      }
    } else {
      console.log('♻️ [REALM DEBUG] Reusing existing Realm instance');
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

// Realm Read/Write methods for Controller objects
console.log('📦 [REALM DEBUG] RealmControllerStorage object created');

export const RealmControllerStorage = {
  writeController(key: string, value: string, isActive: boolean = true): Controller | null {
    console.log(`✏️ [REALM DEBUG] writeController called with key: "${key}"`);
    try {
      console.log('📥 [REALM DEBUG] Getting realm instance for write...');
      const realm = getRealmInstance();
      
      const newController = realm.write(() => {
        return realm.create('Controller', {
          key,
          value,
          isActive,
        }, Realm.UpdateMode.Modified);
      });
      
      // Return a plain object copy
      return {
        key: newController.key,
        value: newController.value,
        isActive: newController.isActive,
      } as Controller;
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to write controller with key ${key}`,
      });
      return null;
    }
  },

  readController(key: string): Controller | null {
    console.log(`📖 [REALM DEBUG] readController called with key: "${key}"`);
    try {
      console.log('📤 [REALM DEBUG] Getting realm instance for read...');
      const realm = getRealmInstance();
      const controller = realm.objectForPrimaryKey('Controller', key);
      
      if (controller) {
        // Return a plain object copy
        return {
          key: controller.key,
          value: controller.value,
          isActive: controller.isActive,
        } as Controller;
      }
      
      return null;
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to read controller with key ${key}`,
      });
      return null;
    }
  },

  removeController(key: string): boolean {
    try {
      const realm = getRealmInstance();
      
      return realm.write(() => {
        const controller = realm.objectForPrimaryKey('Controller', key);
        if (controller) {
          realm.delete(controller);
          return true;
        }
        return false;
      });
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove controller with key ${key}`,
      });
      return false;
    }
  },

  getAllControllers(): Controller[] {
    try {
      const realm = getRealmInstance();
      const controllers = realm.objects('Controller');
      
      // Return plain object copies
      return Array.from(controllers).map(controller => ({
        key: controller.key,
        value: controller.value,
        isActive: controller.isActive,
      } as Controller));
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Failed to get all controllers',
      });
      return [];
    }
  },
};

// NEW: Controller Storage interface using PersistedState schema
// This replaces the FilesystemStorage pattern with Realm storage
console.log('📦 [REALM DEBUG] RealmPersistentStorage object created');

const RealmPersistentStorage = {
  async getItem(key: string): Promise<string | null> {
    console.log(`📖 [REALM PERSIST DEBUG] getItem called with key: "${key}"`);
    try {
      console.log(`🔧 [REALM PERSIST DEBUG] Getting realm instance for key: "${key}"`);
      const realm = getRealmInstance();
      console.log(`🔍 [REALM PERSIST DEBUG] Querying PersistedState for key: "${key}"`);
      const persistedItem = realm.objectForPrimaryKey('PersistedState', key);
      
      if (persistedItem) {
        console.log(`✅ [REALM PERSIST DEBUG] Found item for key: "${key}"`);
        console.log(`📄 [REALM PERSIST DEBUG] Item data type:`, typeof (persistedItem as any).data);
        
        const itemData = (persistedItem as any).data;
        
        // Handle both object and string storage formats
        let result;
        if (typeof itemData === 'string') {
          console.log(`📄 [REALM PERSIST DEBUG] Data stored as string for key: "${key}"`);
          // Data was stored as string (for problematic controllers), return as-is
          result = itemData;
        } else {
          console.log(`📄 [REALM PERSIST DEBUG] Data stored as object for key: "${key}"`);
          // Data was stored as object, stringify it
          result = JSON.stringify(itemData);
        }
        
        console.log(`📤 [REALM PERSIST DEBUG] Returning data for key: "${key}", length: ${result.length}`);
        return result;
      } else {
        console.log(`❌ [REALM PERSIST DEBUG] No item found for key: "${key}"`);
        return null;
      }
    } catch (error) {
      console.log(`💥 [REALM PERSIST DEBUG] Error in getItem for key: "${key}":`, error);
      Logger.error(error as Error, {
        message: `Failed to get persisted item with key ${key}`,
      });
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    console.log(`✏️ [REALM PERSIST DEBUG] setItem called with key: "${key}"`);
    try {
      const realm = getRealmInstance();
      
      // For controllers with problematic data, store the JSON string directly
      // instead of parsing it to avoid Realm's restrictions on object keys with dots
      let dataToStore;
      if (key === 'persist:PermissionController' || key === 'persist:SnapController') {
        console.log(`📝 [REALM PERSIST DEBUG] Using string storage for problematic controller: "${key}"`);
        // Store as string to avoid "key must not contain '.'" error
        dataToStore = value;
      } else {
        try {
          // Parse the JSON string back to object for normal controllers
          dataToStore = JSON.parse(value);
        } catch (parseError) {
          console.log(`⚠️ [REALM PERSIST DEBUG] JSON parse failed for "${key}", storing as string`);
          // If JSON parsing fails, store as string
          dataToStore = value;
        }
      }
      
      realm.write(() => {
        realm.create('PersistedState', {
          key,
          data: dataToStore,
          updatedAt: new Date(),
          version: 1,
        }, Realm.UpdateMode.Modified);
      });
      
      console.log(`✅ [REALM PERSIST DEBUG] Successfully stored item for key: "${key}"`);
    } catch (error) {
      console.log(`💥 [REALM PERSIST DEBUG] Error storing item for key: "${key}":`, error);
      Logger.error(error as Error, {
        message: `Failed to set persisted item with key ${key}`,
      });
      throw error;  // Rethrow to maintain error handling consistency
    }
  },

  async removeItem(key: string): Promise<void> {
    console.log(`🗑️ [REALM PERSIST DEBUG] removeItem called with key: "${key}"`);
    try {
      const realm = getRealmInstance();
      const persistedItem = realm.objectForPrimaryKey('PersistedState', key);
      
      if (persistedItem) {
        realm.write(() => {
          realm.delete(persistedItem);
        });
        console.log(`✅ [REALM PERSIST DEBUG] Successfully removed item for key: "${key}"`);
      } else {
        console.log(`⚠️ [REALM PERSIST DEBUG] Item not found for removal, key: "${key}"`);
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove persisted item with key ${key}`,
      });
      throw error;
    }
  },

  async getAllControllerKeys(): Promise<string[]> {
    console.log('📋 [REALM PERSIST DEBUG] getAllControllerKeys called');
    try {
      const realm = getRealmInstance();
      const allPersistedItems = realm.objects('PersistedState');
      
      // Filter for controller keys (those starting with "persist:")
      const controllerKeys = Array.from(allPersistedItems)
        .map(item => (item as any).key as string)
        .filter(key => key.startsWith('persist:'));
      
      console.log(`✅ [REALM PERSIST DEBUG] Found ${controllerKeys.length} controller keys`);
      return controllerKeys;
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Failed to get all controller keys',
      });
      return [];
    }
  }
};

// Test function to verify read/write operations
function testRealmOperations() {
  console.log('🧪 [REALM DEBUG] testRealmOperations function starting...');
  try {
    // 1. Write a test controller to the database
    console.log('🔄 Writing test controller to Realm database...');
    const testController = RealmControllerStorage.writeController(
      'test-controller-key',
      JSON.stringify({ testData: 'Hello Realm!', timestamp: Date.now() }),
      true
    );
    console.log('✅ Controller written successfully:', testController);

    // 2. Read the controller back from the database
    console.log('🔄 Reading test controller from Realm database...');
    const readController = RealmControllerStorage.readController('test-controller-key');
    console.log('✅ Controller read successfully:', readController);

    // 3. Verify the data matches
    if (readController && readController.key === 'test-controller-key') {
      console.log('🎉 Realm read/write operations successful!');
      console.log('📄 Stored value:', readController.value);
      console.log('🔘 Is active:', readController.isActive);
    } else {
      console.log('❌ Data mismatch or read failed');
    }
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
  console.log('🏁 [REALM DEBUG] testRealmOperations function completed');
}

// Export for external access
export { RealmSingleton, getRealmInstance, testRealmOperations, RealmPersistentStorage };

// Module finished loading - test function available for manual testing
console.log('🎭 [REALM DEBUG] realmInstance.ts module finished loading - ready for use');
