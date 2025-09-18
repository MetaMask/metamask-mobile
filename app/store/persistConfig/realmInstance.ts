import Realm from 'realm';
import { PersistedState } from '../../core/Engine/EngineTask';
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
          schema: [PersistedState],  // Only use PersistedState schema
          path: 'metamask-engine.realm',  // Use specific path to avoid conflicts
          schemaVersion: 3,  // Bump version due to schema removal
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


// Controller Storage interface using PersistedState schema
// This replaces the FilesystemStorage pattern with Realm storage
console.log('📦 [REALM DEBUG] RealmPersistentStorage object created');

// Key transformation utilities for handling problematic characters in object keys
const KeyTransformUtils = {
  // Transform problematic keys to be Realm-safe
  encodeObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.encodeObjectKeys(item));
    }
    
    const transformedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Replace dots with __DOT__ and other problematic characters
      const safeKey = key
        .replace(/\./g, '__DOT__')
        .replace(/:/g, '__COLON__')
        .replace(/@/g, '__AT__')
        .replace(/\//g, '__SLASH__');
      
      // Recursively transform nested objects
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
      // Restore original characters
      const originalKey = key
        .replace(/__DOT__/g, '.')
        .replace(/__COLON__/g, ':')
        .replace(/__AT__/g, '@')
        .replace(/__SLASH__/g, '/');
      
      // Recursively restore nested objects
      originalObj[originalKey] = this.decodeObjectKeys(value);
    }
    
    return originalObj;
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
      if (key.includes('.') || key.includes(':') || key.includes('@') || key.includes('/')) {
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
        
        // Convert managed Realm object to plain object first
        let plainObject: any;
        if (typeof itemData === 'object' && itemData !== null) {
          console.log(`📄 [REALM PERSIST DEBUG] Data stored as object for key: "${key}"`);
          plainObject = JSON.parse(JSON.stringify(itemData));
          
          // Check if this was a transformed object and decode if needed
          if (key === 'persist:PermissionController' || key === 'persist:SnapController') {
            console.log(`🔄 [REALM PERSIST DEBUG] Decoding transformed keys for: "${key}"`);
            const decodedObject = KeyTransformUtils.decodeObjectKeys(plainObject);
            console.log(`📤 [REALM PERSIST DEBUG] Returning decoded object for key: "${key}"`);
            return decodedObject;
          }
          
          console.log(`📤 [REALM PERSIST DEBUG] Returning plain object for key: "${key}"`);
          return plainObject;
        } else {
          // Handle primitives (strings, numbers, booleans)
          console.log(`📄 [REALM PERSIST DEBUG] Data stored as primitive for key: "${key}"`);
          console.log(`📤 [REALM PERSIST DEBUG] Returning primitive value for key: "${key}"`);
          return itemData;
        }
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

  async setItem(key: string, value: any): Promise<void> {
    console.log(`✏️ [REALM PERSIST DEBUG] setItem called with key: "${key}"`);
    console.log(`📄 [REALM PERSIST DEBUG] Value type: ${typeof value}`);
    try {
      const realm = getRealmInstance();
      
      // Parse string values to objects first if possible
      let objectValue: any = value;
      if (typeof value === 'string') {
        try {
          objectValue = JSON.parse(value);
          console.log(`🔄 [REALM PERSIST DEBUG] Parsed JSON string to object for key: "${key}"`);
        } catch (parseError) {
          console.log(`⚠️ [REALM PERSIST DEBUG] Failed to parse JSON for key: "${key}", storing as primitive`);
          objectValue = value; // Keep as string primitive
        }
      }
      
      let dataToStore: any;
      
      // Handle objects with potential key transformation
      if (typeof objectValue === 'object' && objectValue !== null) {
        // Check for problematic controllers and apply key transformation
        if ((key === 'persist:PermissionController' || key === 'persist:SnapController') && 
            KeyTransformUtils.hasProblematicKeys(objectValue)) {
          console.log(`🔧 [REALM PERSIST DEBUG] Transforming problematic keys for: "${key}"`);
          dataToStore = KeyTransformUtils.encodeObjectKeys(objectValue);
          console.log(`📦 [REALM PERSIST DEBUG] Storing transformed object for key: "${key}"`);
        } else {
          console.log(`📦 [REALM PERSIST DEBUG] Storing object directly for key: "${key}"`);
          dataToStore = objectValue;
        }
      } else {
        console.log(`📝 [REALM PERSIST DEBUG] Storing primitive value for key: "${key}"`);
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
      
      console.log(`✅ [REALM PERSIST DEBUG] Successfully stored item for key: "${key}"`);
    } catch (error) {
      console.log(`💥 [REALM PERSIST DEBUG] Error storing item for key: "${key}":`, error);
      Logger.error(error as Error, {
        message: `Failed to set persisted item with key ${key}`,
      });
      throw error;
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

// Verification methods to check Realm data integrity
const RealmVerification = {
  // Show all controllers stored in Realm with their data preview
  async showAllStoredControllers(): Promise<void> {
    console.log('📊 [REALM VERIFICATION] === REALM CONTROLLER INVENTORY ===');
    try {
      const keys = await RealmPersistentStorage.getAllControllerKeys();
      console.log(`📋 [REALM VERIFICATION] Found ${keys.length} controllers in Realm:`);
      
      for (const key of keys) {
        const data = await RealmPersistentStorage.getItem(key);
        if (data) {
          console.log(`  ✅ ${key}:`);
          console.log(`     📄 Data length: ${data.length} chars`);
          console.log(`     📝 Preview: ${data.substring(0, 100)}...`);
          console.log(`     🔍 Type: ${typeof data}`);
          
          // Try to parse and show structure
          try {
            const parsed = JSON.parse(data);
            const keys = Object.keys(parsed);
            console.log(`     🗂️  Has ${keys.length} top-level keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
          } catch {
            console.log(`     ⚠️  Not valid JSON or stored as string`);
          }
        } else {
          console.log(`  ❌ ${key}: No data found`);
        }
      }
    } catch (error) {
      console.log('💥 [REALM VERIFICATION] Error showing stored controllers:', error);
    }
    console.log('📊 [REALM VERIFICATION] === END INVENTORY ===');
  },

  // Test data integrity by writing and reading back
  async testDataIntegrity(testKey: string = 'test-data-integrity'): Promise<boolean> {
    console.log('🧪 [REALM VERIFICATION] Testing data integrity...');
    try {
      const testData = {
        string: 'test string',
        number: 12345,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value', dots: { 'key.with.dots': 'should work in string mode' } },
        timestamp: new Date().toISOString()
      };
      
      const testDataString = JSON.stringify(testData);
      console.log(`📝 [REALM VERIFICATION] Writing test data (${testDataString.length} chars)`);
      
      // Write data
      await RealmPersistentStorage.setItem(testKey, testDataString);
      
      // Read it back
      const retrievedData = await RealmPersistentStorage.getItem(testKey);
      
      if (!retrievedData) {
        console.log('❌ [REALM VERIFICATION] No data retrieved');
        return false;
      }
      
      // Compare
      const isMatching = retrievedData === testDataString;
      const retrievedParsed = JSON.parse(retrievedData);
      
      console.log(`✅ [REALM VERIFICATION] Data integrity test ${isMatching ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 [REALM VERIFICATION] Original: ${testDataString.length} chars`);
      console.log(`📊 [REALM VERIFICATION] Retrieved: ${retrievedData.length} chars`);
      console.log(`🔍 [REALM VERIFICATION] Data matches exactly: ${isMatching}`);
      console.log(`🔍 [REALM VERIFICATION] Parsed object keys: ${Object.keys(retrievedParsed).join(', ')}`);
      
      // Clean up
      await RealmPersistentStorage.removeItem(testKey);
      
      return isMatching;
    } catch (error) {
      console.log('💥 [REALM VERIFICATION] Data integrity test failed:', error);
      return false;
    }
  },

  // Show storage statistics
  async getStorageStats(): Promise<void> {
    console.log('📈 [REALM VERIFICATION] === STORAGE STATISTICS ===');
    try {
      const realm = getRealmInstance();
      
      // Count all PersistedState objects
      const allItems = realm.objects('PersistedState');
      const totalCount = allItems.length;
      
      // Count by controller type
      const controllerCounts: Record<string, number> = {};
      let totalDataSize = 0;
      
      Array.from(allItems).forEach((item: any) => {
        const key = item.key as string;
        if (key.startsWith('persist:')) {
          const controllerName = key.replace('persist:', '');
          controllerCounts[controllerName] = (controllerCounts[controllerName] || 0) + 1;
          
          // Estimate data size
          if (typeof item.data === 'string') {
            totalDataSize += item.data.length;
          } else {
            totalDataSize += JSON.stringify(item.data).length;
          }
        }
      });
      
      console.log(`📊 [REALM VERIFICATION] Total stored items: ${totalCount}`);
      console.log(`📊 [REALM VERIFICATION] Total data size: ~${Math.round(totalDataSize / 1024)}KB`);
      console.log(`📊 [REALM VERIFICATION] Controllers by type:`);
      
      Object.entries(controllerCounts).forEach(([name, count]) => {
        console.log(`  📋 ${name}: ${count} entries`);
      });
      
    } catch (error) {
      console.log('💥 [REALM VERIFICATION] Error getting storage stats:', error);
    }
    console.log('📈 [REALM VERIFICATION] === END STATISTICS ===');
  },

  // Compare specific controller between Realm and FileSystem
  async compareControllerData(controllerName: string): Promise<void> {
    console.log(`🔍 [REALM VERIFICATION] Comparing ${controllerName} between Realm and FileSystem...`);
    try {
      const key = `persist:${controllerName}`;
      
      // Get from Realm
      const realmData = await RealmPersistentStorage.getItem(key);
      
      // Get from FileSystem (import here to avoid circular dependencies)
      const FilesystemStorage = require('redux-persist-filesystem-storage').default;
      const filesystemData = await FilesystemStorage.getItem(key);
      
      console.log(`📊 [REALM VERIFICATION] ${controllerName} comparison:`);
      console.log(`  🗄️  Realm: ${realmData ? `${realmData.length} chars` : 'NOT FOUND'}`);
      console.log(`  📁 FileSystem: ${filesystemData ? `${filesystemData.length} chars` : 'NOT FOUND'}`);
      
      if (realmData && filesystemData) {
        const matches = realmData === filesystemData;
        console.log(`  🔍 Data matches: ${matches ? '✅ YES' : '❌ NO'}`);
        
        if (!matches) {
          console.log(`  🔍 Realm preview: ${realmData.substring(0, 200)}...`);
          console.log(`  🔍 FileSystem preview: ${filesystemData.substring(0, 200)}...`);
        }
      }
      
    } catch (error) {
      console.log(`💥 [REALM VERIFICATION] Error comparing ${controllerName}:`, error);
    }
  }
};


// Export for external access
export { RealmSingleton, getRealmInstance, RealmPersistentStorage, RealmVerification };

// Module finished loading - test function available for manual testing
console.log('🎭 [REALM DEBUG] realmInstance.ts module finished loading - ready for use');
