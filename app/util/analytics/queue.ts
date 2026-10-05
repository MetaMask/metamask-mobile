import type { RootExtendedMessenger } from '../../core/Engine/types';
import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
  AnalyticsTrackingEvent as PackageAnalyticsTrackingEvent,
} from '@metamask/analytics-controller';
import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import Logger from '../Logger';

/**
 * Queued analytics operation
 */
export interface QueuedOperation {
  readonly action: string;
  readonly args: readonly unknown[];
}

/**
 * Queue state type (immutable)
 */
export interface QueueState {
  readonly messenger: RootExtendedMessenger | null;
  readonly messengerReady: Promise<void> | null;
  readonly queue: readonly QueuedOperation[];
  readonly processing: boolean;
  readonly processingPromise: Promise<void> | null;
}

/**
 * Queue action types for reducer
 */
export type QueueAction =
  | { type: 'ADD_OPERATION'; payload: QueuedOperation }
  | { type: 'SET_MESSENGER'; payload: RootExtendedMessenger }
  | { type: 'SET_MESSENGER_READY'; payload: Promise<void> }
  | {
      type: 'SET_PROCESSING';
      payload: { processing: boolean; promise: Promise<void> | null };
    }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'REMOVE_OPERATIONS'; payload: { count: number } }
  | { type: 'RESET' };

/**
 * Queue manager dependencies
 */
export interface QueueManagerDependencies {
  getEngineMessenger: () => RootExtendedMessenger | null;
  whenEngineReady: () => Promise<void>;
}

/**
 * Queue manager interface
 */
export interface QueueManager {
  queueOperation: (action: string, ...args: unknown[]) => Promise<void>;
  setMessenger: (messenger: RootExtendedMessenger) => void;
  reset: () => void;
  getQueueLength: () => number;
  isProcessing: () => boolean;
  waitForQueue: () => Promise<void>;
}

/**
 * Initial queue state
 */
const createInitialState = (): QueueState => ({
  messenger: null,
  messengerReady: null,
  queue: [],
  processing: false,
  processingPromise: null,
});

/**
 * Pure reducer function for state transitions
 */
const queueReducer = (state: QueueState, action: QueueAction): QueueState => {
  switch (action.type) {
    case 'ADD_OPERATION':
      return {
        ...state,
        queue: [...state.queue, action.payload],
      };
    case 'SET_MESSENGER':
      return {
        ...state,
        messenger: action.payload,
      };
    case 'SET_MESSENGER_READY':
      return {
        ...state,
        messengerReady: action.payload,
      };
    case 'SET_PROCESSING':
      return {
        ...state,
        processing: action.payload.processing,
        processingPromise: action.payload.promise,
      };
    case 'CLEAR_QUEUE':
      return {
        ...state,
        queue: [],
      };
    case 'REMOVE_OPERATIONS':
      return {
        ...state,
        queue: state.queue.slice(action.payload.count),
      };
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
};

/**
 * Pure function to execute a queued operation
 */
const executeQueuedOperation = async (
  messengerInstance: RootExtendedMessenger,
  action: string,
  args: readonly unknown[],
): Promise<void> => {
  switch (action) {
    case 'trackEvent': {
      const [event] = args as [AnalyticsTrackingEvent];
      // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
      messengerInstance.call(
        'AnalyticsController:trackEvent',
        event as unknown as PackageAnalyticsTrackingEvent,
      );
      break;
    }
    case 'trackView': {
      const [name, properties] = args as [string, AnalyticsEventProperties?];
      messengerInstance.call('AnalyticsController:trackView', name, properties);
      break;
    }
    case 'identify': {
      const [traits] = args as [AnalyticsUserTraits?];
      messengerInstance.call('AnalyticsController:identify', traits);
      break;
    }
    case 'optIn':
      messengerInstance.call('AnalyticsController:optIn');
      break;
    case 'optOut':
      messengerInstance.call('AnalyticsController:optOut');
      break;
    case 'optInToMarketing':
      // optInToMarketing returns a promise. Await it so the queue waits for
      // consent before the next operation and the rejection is caught below.
      await messengerInstance.call('AnalyticsController:optInToMarketing');
      break;
    case 'optOutOfMarketing':
      await messengerInstance.call('AnalyticsController:optOutOfMarketing');
      break;
    case 'resetMarketingConsentDecision':
      await messengerInstance.call(
        'AnalyticsController:resetMarketingConsentDecision',
      );
      break;
    default:
      Logger.error(
        new Error(`Unknown analytics action: ${action}`),
        'Analytics: Attempted to execute unknown action',
      );
  }
};

const MARKETING_CONSENT_ACTIONS = new Set([
  'optInToMarketing',
  'optOutOfMarketing',
  'resetMarketingConsentDecision',
]);

/**
 * Marketing consent is a mutation the caller must observe. Tracking stays best-effort.
 */
const isMarketingConsentAction = (action: string): boolean =>
  MARKETING_CONSENT_ACTIONS.has(action);

interface OperationSettlement {
  resolve: () => void;
  reject: (error: unknown) => void;
}

/**
 * Pure function to check if queue can be processed
 */
const canProcessQueue = (state: QueueState): boolean =>
  !state.processing && state.queue.length > 0 && state.messenger !== null;

/**
 * Create analytics queue manager
 * Returns functions to interact with the queue
 *
 * Uses functional programming patterns:
 * - Pure reducer for state transitions
 * - Immutable state updates
 * - Dependency injection for testability
 * - Side effects isolated in executeQueuedOperation
 */
export const createAnalyticsQueueManager = (
  dependencies: QueueManagerDependencies,
): QueueManager => {
  // State managed in closure (updated immutably via reducer)
  let state: QueueState = createInitialState();
  // Settled independently of the batch promise so a consent rejection does not
  // fail tracking operations queued in the same batch.
  const operationSettlements = new Map<QueuedOperation, OperationSettlement>();

  /**
   * Update state using reducer (immutable update)
   */
  const dispatch = (action: QueueAction): QueueState => {
    state = queueReducer(state, action);
    return state;
  };

  /**
   * Process queued operations
   * Returns a promise that resolves when processing is complete
   */
  const processQueue = async (): Promise<void> => {
    // If already processing, wait for current processing to complete
    if (state.processingPromise) {
      return state.processingPromise;
    }

    if (!canProcessQueue(state)) {
      return Promise.resolve();
    }

    const messengerInstance = state.messenger;
    if (!messengerInstance) {
      return Promise.resolve();
    }
    const operations = state.queue; // Read-only, already immutable
    const operationsCount = operations.length;

    // Create the processing promise - defer execution to next tick so state can be set first
    const processingPromise = Promise.resolve().then(async () => {
      // Remove only the operations we're processing (immutable update)
      // This prevents race conditions where new operations are added between
      // capturing the queue and clearing it
      dispatch({
        type: 'REMOVE_OPERATIONS',
        payload: { count: operationsCount },
      });

      // Each operation waits for the previous one so a marketing opt-in is
      // applied before the events queued behind it. A consent rejection is
      // returned to that operation's caller. Other failures are logged and
      // the rest of the batch still runs.
      await operations.reduce<Promise<void>>(async (previous, operation) => {
        await previous;
        const settlement = operationSettlements.get(operation);
        try {
          await executeQueuedOperation(
            messengerInstance,
            operation.action,
            operation.args,
          );
          settlement?.resolve();
        } catch (error) {
          if (isMarketingConsentAction(operation.action)) {
            settlement?.reject(error);
          } else {
            Logger.error(
              new Error(String(error)),
              `Analytics: Failed to process queued operation '${operation.action}' - continuing with next operation`,
            );
            settlement?.resolve();
          }
        } finally {
          operationSettlements.delete(operation);
        }
      }, Promise.resolve());

      // Mark as not processing (immutable update)
      dispatch({
        type: 'SET_PROCESSING',
        payload: { processing: false, promise: null },
      });

      // Drain any operations that were queued while this batch was running
      if (canProcessQueue(state)) {
        await processQueue();
      }
    });

    // Set processing promise in state (mark as processing) - must happen BEFORE the promise starts executing
    dispatch({
      type: 'SET_PROCESSING',
      payload: { processing: true, promise: processingPromise },
    });

    return processingPromise;
  };

  /**
   * Ensure messenger is ready
   */
  const ensureMessengerReady = async (): Promise<void> => {
    if (state.messengerReady) {
      return state.messengerReady;
    }

    const readyPromise = (async () => {
      await dependencies.whenEngineReady();
      const messenger = dependencies.getEngineMessenger();
      if (messenger) {
        dispatch({ type: 'SET_MESSENGER', payload: messenger });
        await processQueue();
      }
    })();

    dispatch({ type: 'SET_MESSENGER_READY', payload: readyPromise });
    return readyPromise;
  };

  /**
   * Add operation to queue and trigger processing
   */
  const queueOperation = async (
    action: string,
    ...args: unknown[]
  ): Promise<void> => {
    const operation: QueuedOperation = { action, args: [...args] };
    const result = new Promise<void>((resolve, reject) => {
      operationSettlements.set(operation, { resolve, reject });
    });
    dispatch({
      type: 'ADD_OPERATION',
      payload: operation,
    });

    if (state.messenger) {
      // The caller waits on this operation. The batch promise stays in state
      // so a later waitForQueue still sees the whole batch.
      processQueue().catch((error: unknown) => {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'Analytics: Failed to process queued operations',
        );
      });
      return result;
    }
    // Messenger not ready, ensure it's ready first
    try {
      await ensureMessengerReady();
    } catch (error) {
      Logger.error(
        new Error(String(error)),
        'Analytics: Failed to initialize messenger - operations will remain queued',
      );
      operationSettlements.delete(operation);
      return;
    }
    if (operationSettlements.has(operation)) {
      // Ready finished without a messenger. The operation stays queued, and
      // this call has nothing further to wait on.
      operationSettlements.delete(operation);
      return;
    }
    return result;
  };

  /**
   * Set messenger directly (for testing)
   */
  const setMessenger = (messenger: RootExtendedMessenger): void => {
    dispatch({ type: 'SET_MESSENGER', payload: messenger });
    processQueue();
  };

  /**
   * Reset state (for testing)
   */
  const reset = (): void => {
    operationSettlements.clear();
    dispatch({ type: 'RESET' });
  };

  /**
   * Get current queue length (for testing)
   */
  const getQueueLength = (): number => state.queue.length;

  /**
   * Check if processing (for testing)
   */
  const isProcessing = (): boolean => state.processing;

  /**
   * Wait for queue processing to complete (for testing)
   */
  const waitForQueue = async (): Promise<void> => {
    if (state.processingPromise) {
      await state.processingPromise;
    }
    // Wait one more tick to ensure all operations are complete
    await new Promise(process.nextTick);
  };

  return {
    queueOperation,
    setMessenger,
    reset,
    getQueueLength,
    isProcessing,
    waitForQueue,
  };
};
