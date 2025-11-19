import Engine from '../../core/Engine';
import { ControllerStorage } from '../../store/persistConfig';
import Logger from '../Logger';

export interface MeasurementResult {
  singleFileWrite: {
    averageTime: number;
    runs: number[];
    totalSize: number;
  };
  multiFileWrite: {
    averageTime: number;
    runs: number[];
    individualSizes: Record<string, number>;
  };
  improvement: string;
  platform: string;
}

const CONTROLLERS_TO_TEST = [
  'TokensController',
  'TokenListController',
  'AccountsController',
  'NftController',
];

const TEST_RUNS = 3;

/**
 * Gets the current state from the specified controllers
 */
function getControllerStates(): Record<string, unknown> {
  const states: Record<string, unknown> = {};
  
  for (const controllerName of CONTROLLERS_TO_TEST) {
    try {
      // @ts-expect-error - Engine context types are complex
      const controller = Engine.context[controllerName];
      if (controller && controller.state) {
        states[controllerName] = controller.state;
      } else {
        Logger.log(`Warning: ${controllerName} not found or has no state`);
      }
    } catch (error) {
      Logger.error(error as Error, `Failed to get state for ${controllerName}`);
    }
  }
  
  return states;
}

/**
 * Calculate the size of a JSON-stringified object in bytes
 */
function calculateSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Measure time to write all controllers to a single combined file
 */
async function measureSingleFileWrite(states: Record<string, unknown>): Promise<number> {
  const startTime = performance.now();
  
  try {
    await ControllerStorage.setItem(
      'persist:combined-test',
      JSON.stringify(states),
    );
  } catch (error) {
    Logger.error(error as Error, 'Failed to write combined test file');
    throw error;
  }
  
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Measure time to write controllers to separate files in parallel
 */
async function measureMultiFileWrite(states: Record<string, unknown>): Promise<number> {
  const startTime = performance.now();
  
  try {
    await Promise.all(
      Object.entries(states).map(([controllerName, state]) =>
        ControllerStorage.setItem(
          `persist:test-${controllerName}`,
          JSON.stringify(state),
        ),
      ),
    );
  } catch (error) {
    Logger.error(error as Error, 'Failed to write separate test files');
    throw error;
  }
  
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Clean up test files
 */
async function cleanupTestFiles(states: Record<string, unknown>): Promise<void> {
  try {
    // Remove combined test file
    await ControllerStorage.removeItem('persist:combined-test');
    
    // Remove individual test files
    await Promise.all(
      Object.keys(states).map((controllerName) =>
        ControllerStorage.removeItem(`persist:test-${controllerName}`),
      ),
    );
  } catch (error) {
    Logger.error(error as Error, 'Failed to cleanup test files');
  }
}

/**
 * Run the filesystem write performance measurement
 */
export async function runFilesystemMeasurement(): Promise<MeasurementResult> {
  console.log('🔬 [PERSISTENCE MEASUREMENT] Starting...');
  
  // Get current controller states
  const states = getControllerStates();
  
  if (Object.keys(states).length === 0) {
    throw new Error('No controller states found to measure');
  }
  
  // Calculate sizes
  const totalSize = calculateSize(states);
  const individualSizes: Record<string, number> = {};
  for (const [name, state] of Object.entries(states)) {
    individualSizes[name] = calculateSize(state);
  }
  
  // Run single file write tests
  const singleFileRuns: number[] = [];
  for (let i = 0; i < TEST_RUNS; i++) {
    const time = await measureSingleFileWrite(states);
    singleFileRuns.push(Math.round(time * 100) / 100); // Round to 2 decimals
    await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between runs
  }
  
  // Run multi file write tests
  const multiFileRuns: number[] = [];
  for (let i = 0; i < TEST_RUNS; i++) {
    const time = await measureMultiFileWrite(states);
    multiFileRuns.push(Math.round(time * 100) / 100);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  // Calculate averages
  const singleAvg = singleFileRuns.reduce((a, b) => a + b, 0) / singleFileRuns.length;
  const multiAvg = multiFileRuns.reduce((a, b) => a + b, 0) / multiFileRuns.length;
  
  // Calculate improvement
  const difference = multiAvg - singleAvg;
  const multiplier = multiAvg / singleAvg;
  const improvement = difference > 0
    ? `Multi-file is ${multiplier.toFixed(2)}x SLOWER (+${Math.round(difference)}ms)`
    : `Multi-file is ${(1 / multiplier).toFixed(2)}x FASTER (-${Math.round(Math.abs(difference))}ms)`;
  
  // Clean up test files
  await cleanupTestFiles(states);
  
  const result: MeasurementResult = {
    singleFileWrite: {
      averageTime: Math.round(singleAvg * 100) / 100,
      runs: singleFileRuns,
      totalSize,
    },
    multiFileWrite: {
      averageTime: Math.round(multiAvg * 100) / 100,
      runs: multiFileRuns,
      individualSizes,
    },
    improvement,
    platform: require('react-native').Platform.OS,
  };
  
  // Log detailed results
  console.log('🔬 [PERSISTENCE MEASUREMENT]');
  console.log('================================');
  console.log('Test A - Single File Write:');
  console.log(`  Average: ${result.singleFileWrite.averageTime}ms`);
  console.log(`  Runs: ${singleFileRuns.map((t) => `${t}ms`).join(', ')}`);
  console.log(`  Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log('');
  console.log('Test B - Multiple File Writes:');
  console.log(`  Average: ${result.multiFileWrite.averageTime}ms`);
  console.log(`  Runs: ${multiFileRuns.map((t) => `${t}ms`).join(', ')}`);
  console.log('  Sizes:', Object.entries(individualSizes)
    .map(([name, size]) => `${name}(${(size / 1024 / 1024).toFixed(2)}MB)`)
    .join(', '));
  console.log('');
  console.log(`Result: ${result.improvement}`);
  console.log(`Platform: ${result.platform}`);
  console.log('================================');
  
  return result;
}

/**
 * Format the measurement result as text for clipboard
 */
export function formatResultForClipboard(result: MeasurementResult): string {
  const { singleFileWrite, multiFileWrite, improvement, platform } = result;
  
  return `Filesystem Write Performance Measurement
Platform: ${platform.toUpperCase()}
================================

Test A - Single File Write:
  Average: ${singleFileWrite.averageTime}ms
  Runs: ${singleFileWrite.runs.map((t) => `${t}ms`).join(', ')}
  Total Size: ${(singleFileWrite.totalSize / 1024 / 1024).toFixed(2)}MB

Test B - Multiple File Writes:
  Average: ${multiFileWrite.averageTime}ms
  Runs: ${multiFileWrite.runs.map((t) => `${t}ms`).join(', ')}
  Individual Sizes:
${Object.entries(multiFileWrite.individualSizes)
  .map(([name, size]) => `    ${name}: ${(size / 1024 / 1024).toFixed(2)}MB`)
  .join('\n')}

Result: ${improvement}
Difference: ${Math.round(multiFileWrite.averageTime - singleFileWrite.averageTime)}ms
================================`;
}

