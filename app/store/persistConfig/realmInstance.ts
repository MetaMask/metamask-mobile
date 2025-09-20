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
          schema: [PersistedState],  // Only use PersistedState schema
          path: realmPath,  // Use specific path to avoid conflicts
          schemaVersion: 3,  // Bump version due to schema removal; TODO: When preparing this for production, revise this schemaVersion with project lead.
        });

        // 🔒 CRITICAL SECURITY: Exclude Realm file from iCloud backup
        if (Platform.OS === 'ios') {
          try {
            const fullRealmPath = RealmSingleton.instance.path;
            ReactNativeBlobUtil.ios.excludeFromBackupKey(fullRealmPath);
          } catch (backupError) {
            console.error('❌ [SECURITY] Failed to exclude Realm from backup:', backupError);
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
    const perf0 = new Date().getTime();

    try {
      const realm = getRealmInstance();

      const perf1 = new Date().getTime();
      const persistedItem = realm.objectForPrimaryKey('PersistedState', key);
      const perf2 = new Date().getTime();

      console.log(`⏱️ [PERF] ${key} - Realm read: ${perf2 - perf1}ms`);

      if (persistedItem) {
        const itemData = (persistedItem as any).data;

        // Convert managed Realm object to plain object first
        let plainObject: any;
        if (typeof itemData === 'object' && itemData !== null) {
          const perf3 = new Date().getTime();
          plainObject = JSON.parse(JSON.stringify(itemData));
          const perf4 = new Date().getTime();

          console.log(`⏱️ [PERF] ${key} - JSON parse/stringify: ${perf4 - perf3}ms`);

          // Check if this was a transformed object and decode if needed
          if (key === 'persist:PermissionController' || key === 'persist:SnapController') {
            const decodedObject = KeyTransformUtils.decodeObjectKeys(plainObject);
            console.log(`⏱️ [PERF] ${key} - Total read time: ${new Date().getTime() - perf0}ms`);
            return decodedObject;
          }

          console.log(`⏱️ [PERF] ${key} - Total read time: ${new Date().getTime() - perf0}ms`);
          return plainObject;
        } else {
          // Handle primitives (strings, numbers, booleans)
          console.log(`⏱️ [PERF] ${key} - Total read time: ${new Date().getTime() - perf0}ms`);
          return itemData;
        }
      } else {
        console.log(`⏱️ [PERF] ${key} - Not found, read time: ${new Date().getTime() - perf0}ms`);
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
    const perf0 = new Date().getTime();

    try {
      const realm = getRealmInstance();

      // Parse string values to objects first if possible
      let objectValue: any = value;
      if (typeof value === 'string') {
        try {
          const perf1 = new Date().getTime();
          objectValue = JSON.parse(value);
          const perf2 = new Date().getTime();
          console.log(`⏱️ [PERF] ${key} - JSON.parse: ${perf2 - perf1}ms`);
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

      const perf3 = new Date().getTime();
      realm.write(() => {
        realm.create('PersistedState', {
          key,
          data: dataToStore,
          updatedAt: new Date(),
          version: 1,
        }, Realm.UpdateMode.Modified);
      });
      const perf4 = new Date().getTime();

      console.log(`⏱️ [PERF] ${key} - Realm write: ${perf4 - perf3}ms`);
      console.log(`⏱️ [PERF] ${key} - Total write time: ${perf4 - perf0}ms`);
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

const RealmPerformanceBenchmark = {
  async benchmarkStoragePerformance(controllerName: string = 'TransactionController'): Promise<void> {
    console.log(`🏁 [PERF BENCHMARK] Starting storage performance test for ${controllerName}...`);

    try {
      // Get the controller data (targeting largest controller)
      const key = `persist:${controllerName}`;
      const controllerData = await RealmPersistentStorage.getItem(key);

      if (!controllerData) {
        console.log(`❌ [PERF BENCHMARK] No data found for ${controllerName}, using sample data`);
        // Create sample large data if controller not found
        const sampleData = {
          transactions: Array(100).fill(0).map((_, i) => ({
            id: `transaction-${i}`,
            hash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            from: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            to: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            value: Math.random() * 1000000,
            data: `0x${Array(200).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            timestamp: Date.now(),
          })),
          metadata: { version: 1, lastUpdated: Date.now() }
        };
        return this.benchmarkWithData(sampleData, `Test-${controllerName}`);
      }

      return this.benchmarkWithData(controllerData, controllerName);
    } catch (error) {
      console.log(`💥 [PERF BENCHMARK] Error in benchmark:`, error);
    }
  },

  async benchmarkWithData(testData: any, dataLabel: string): Promise<void> {
    console.log(`📊 [PERF BENCHMARK] === STORAGE PERFORMANCE TEST: ${dataLabel} ===`);

    // Measure data size
    const jsonString = JSON.stringify(testData);
    const dataSizeKB = Math.round(jsonString.length / 1024);
    console.log(`📦 [PERF BENCHMARK] Data size: ${dataSizeKB}KB`);

    // === REALM PERFORMANCE TEST ===
    console.log(`\n🗄️  [PERF BENCHMARK] REALM PERFORMANCE:`);

    // Test 1: Realm Instance Creation
    const perf0 = new Date().getTime();
    const realm = new Realm({
      schema: [PersistedState],
      path: `benchmark-test.realm`,
      schemaVersion: 3,
    });
    const perf1 = new Date().getTime();
    console.log(`⏱️  Realm creation: ${perf1 - perf0}ms`);

    // Test 2: JSON.stringify + Realm Write
    const perf2 = new Date().getTime();
    const jsonStringifyStart = new Date().getTime();
    const dataString = JSON.stringify(testData);
    const jsonStringifyEnd = new Date().getTime();

    realm.write(() => {
      realm.create('PersistedState', {
        key: 'BenchmarkTest',
        data: testData, // Store as object
        updatedAt: new Date(),
        version: 1,
      }, Realm.UpdateMode.Modified);
    });
    const perf3 = new Date().getTime();
    console.log(`⏱️  JSON.stringify: ${jsonStringifyEnd - jsonStringifyStart}ms`);
    console.log(`⏱️  Realm write: ${perf3 - perf2}ms`);

    // Test 3: Realm Read + JSON Operations
    const perf4 = new Date().getTime();
    const retrievedItem = realm.objectForPrimaryKey('PersistedState', 'BenchmarkTest');
    const perf5 = new Date().getTime();

    const jsonParseStart = new Date().getTime();
    const retrievedData = JSON.parse(JSON.stringify((retrievedItem as any).data));
    const jsonParseEnd = new Date().getTime();

    console.log(`⏱️  Realm read: ${perf5 - perf4}ms`);
    console.log(`⏱️  JSON.parse: ${jsonParseEnd - jsonParseStart}ms`);

    // Test 4: Realm Close
    const perf6 = new Date().getTime();
    realm.close();
    const perf7 = new Date().getTime();
    console.log(`⏱️  Realm close: ${perf7 - perf6}ms`);

    const totalRealmTime = perf7 - perf0;
    console.log(`⏱️  TOTAL Realm time: ${totalRealmTime}ms`);

    // === FILESYSTEM STORAGE PERFORMANCE TEST ===
    console.log(`\n📁 [PERF BENCHMARK] FILESYSTEM PERFORMANCE:`);

    const perf8 = new Date().getTime();

    // Import FilesystemStorage
    const FilesystemStorage = require('redux-persist-filesystem-storage').default;

    // Test Filesystem Write with JSON.stringify
    await new Promise<void>((resolve) => {
      FilesystemStorage.setItem('BenchmarkTest', jsonString, true, () => {
        const perf9 = new Date().getTime();
        console.log(`⏱️  Filesystem write (with JSON.stringify): ${perf9 - perf8}ms`);

        // Test Filesystem Read with JSON.parse
        const perf10 = new Date().getTime();
        FilesystemStorage.getItem('BenchmarkTest', (error: any, result: string) => {
          const perf11 = new Date().getTime();
          console.log(`⏱️  Filesystem read: ${perf11 - perf10}ms`);

          if (result) {
            const jsonParseStart = new Date().getTime();
            const parsedResult = JSON.parse(result);
            const jsonParseEnd = new Date().getTime();
            console.log(`⏱️  JSON.parse: ${jsonParseEnd - jsonParseStart}ms`);

            const totalFilesystemTime = perf11 - perf8;
            console.log(`⏱️  TOTAL Filesystem time: ${totalFilesystemTime}ms`);

            // Comparison
            console.log(`\n📊 [PERF BENCHMARK] COMPARISON:`);
            console.log(`  🗄️  Realm total: ${totalRealmTime}ms`);
            console.log(`  📁 Filesystem total: ${totalFilesystemTime}ms`);
            console.log(`  🏆 Winner: ${totalRealmTime < totalFilesystemTime ? 'Realm' : 'Filesystem'} (${Math.abs(totalRealmTime - totalFilesystemTime)}ms faster)`);
          }

          resolve();
        });
      });
    });

    // Clean up
    try {
      FilesystemStorage.removeItem('BenchmarkTest');
    } catch (cleanupError) {
      console.log(`⚠️  Cleanup warning:`, cleanupError);
    }

    console.log(`📊 [PERF BENCHMARK] === END PERFORMANCE TEST ===\n`);
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
export { RealmSingleton, getRealmInstance, RealmPersistentStorage, RealmVerification, RealmPerformanceBenchmark };

// Module finished loading - test function available for manual testing
console.log('🎭 [REALM DEBUG] realmInstance.ts module finished loading - ready for use');

// Make performance benchmark available globally for debugging
if (__DEV__) {
  (global as any).RealmPerformanceBenchmark = RealmPerformanceBenchmark;
  console.log('🏁 [PERF BENCHMARK] Performance benchmark available globally: RealmPerformanceBenchmark.benchmarkStoragePerformance()');
}
