import Realm from 'realm';
import { Controller } from '../../core/Engine/EngineTask';
import Logger from '../../util/Logger';

console.log('🚀 [REALM DEBUG] realmInstance.ts module loading...');

// Singleton Realm instance to avoid "different schema mode" error
class RealmSingleton {
  private static instance: Realm | null = null;

  static getInstance(): Realm {
    console.log('🗄️ [REALM DEBUG] getInstance() called');
    if (!RealmSingleton.instance || RealmSingleton.instance.isClosed) {
      console.log('🔧 [REALM DEBUG] Creating new Realm instance...');
      try {
        RealmSingleton.instance = new Realm({ 
          schema: [Controller],
          path: 'metamask-engine.realm',  // Use specific path to avoid conflicts
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
export { RealmSingleton, getRealmInstance, testRealmOperations };

// Run the test when this module loads
console.log('🎬 [REALM DEBUG] About to call testRealmOperations...');
testRealmOperations();
console.log('🎭 [REALM DEBUG] testRealmOperations call completed, module finished loading');
