import { BRAZE_PUSH_UNREGISTRATION_PENDING } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

export interface BrazePushOperationContext {
  isCurrent: () => boolean;
}

interface PendingOperation<T> {
  key: string;
  operation: (context: BrazePushOperationContext) => Promise<T>;
  resolve: (result: T) => void;
  reject: (error: unknown) => void;
  supersededResult: T;
}

interface ActiveOperation {
  key: string;
  promise: Promise<unknown>;
}

let latestOperationKey: string | undefined;
let activeOperation: ActiveOperation | undefined;
let pendingOperation: PendingOperation<unknown> | undefined;

function runPendingOperation(): void {
  if (activeOperation || !pendingOperation) {
    return;
  }

  const operation = pendingOperation;
  pendingOperation = undefined;
  const promise = Promise.resolve().then(() =>
    operation.operation({
      isCurrent: () => latestOperationKey === operation.key,
    }),
  );
  activeOperation = { key: operation.key, promise };

  promise.then(operation.resolve, operation.reject).finally(() => {
    if (activeOperation?.promise === promise) {
      activeOperation = undefined;
    }
    runPendingOperation();
  });
}

/**
 * Run at most one Braze push operation at a time while retaining only the
 * latest requested state. An in-flight native call is allowed to finish, then
 * the latest different state is applied.
 *
 * Calls requesting the active state share its result. A pending operation that
 * is replaced resolves with its own `supersededResult`.
 *
 * @param options - Operation identity, implementation, and superseded result.
 * @returns The result of applying or superseding this request.
 */
export function runLatestBrazePushOperation<T>({
  key,
  operation,
  supersededResult,
}: {
  key: string;
  operation: (context: BrazePushOperationContext) => Promise<T>;
  supersededResult: T;
}): Promise<T> {
  latestOperationKey = key;

  if (activeOperation?.key === key) {
    if (pendingOperation) {
      pendingOperation.resolve(pendingOperation.supersededResult);
      pendingOperation = undefined;
    }
    return activeOperation.promise as Promise<T>;
  }

  let resolveOperation: (result: T) => void = () => undefined;
  let rejectOperation: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveOperation = resolve;
    rejectOperation = reject;
  });
  const nextOperation: PendingOperation<T> = {
    key,
    operation,
    resolve: resolveOperation,
    reject: rejectOperation,
    supersededResult,
  };

  if (pendingOperation) {
    pendingOperation.resolve(pendingOperation.supersededResult);
  }
  pendingOperation = nextOperation as PendingOperation<unknown>;
  runPendingOperation();

  return promise;
}

export function hasPendingBrazePushUnregistrationSync(): boolean {
  return Boolean(StorageWrapper.getItemSync(BRAZE_PUSH_UNREGISTRATION_PENDING));
}

export async function markBrazePushUnregistrationPending(): Promise<void> {
  await StorageWrapper.setItem(BRAZE_PUSH_UNREGISTRATION_PENDING, 'true');
}

export async function clearPendingBrazePushUnregistration(): Promise<void> {
  await StorageWrapper.removeItem(BRAZE_PUSH_UNREGISTRATION_PENDING);
}

export function resetBrazePushOperationCoordinatorForTests(): void {
  pendingOperation?.resolve(pendingOperation.supersededResult);
  latestOperationKey = undefined;
  activeOperation = undefined;
  pendingOperation = undefined;
}
