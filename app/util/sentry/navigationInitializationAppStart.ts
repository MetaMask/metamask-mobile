import {
  extendAppStart,
  finishExtendedAppStart,
  getClient,
  getExtendedAppStartSpan,
  spanIsSampled,
  startInactiveSpan,
  type Span,
} from '@sentry/react-native';

export const NAVIGATION_INITIALIZATION_SPAN_NAME =
  'Navigation Initialization';

/**
 * Shape of the SDK's `AppRegistry` integration. Looked up by name instead of
 * imported so this file does not reach into the SDK's internal module paths.
 */
interface AppRegistryIntegrationLike {
  name: string;
  onRunApplication: (callback: () => void) => void;
}

let navigationInitSpan: Span | undefined;
let hasFinished = false;
let navigationReadyBeforeBegin = false;
let isListeningForRunApplication = false;

/**
 * Keeps standalone App Start open after `Sentry.init` and starts the child
 * span that later trims App Start to NavigationContainer `onReady`.
 *
 * `extendAppStart` is a no-op when the SDK already captured the standalone
 * transaction for this run, in which case `getExtendedAppStartSpan` hands back
 * a non-recording span. Bail without marking the work done so a later
 * `Sentry.init` (consent opt-in re-initialises the client) can still extend.
 *
 * If `onReady` already ran, the child is ended immediately so the extension
 * does not hang until the SDK deadline.
 */
export function beginNavigationInitializationAppStart(): void {
  if (navigationInitSpan || hasFinished) {
    return;
  }

  extendAppStart();

  const extendedAppStartSpan = getExtendedAppStartSpan();
  if (!spanIsSampled(extendedAppStartSpan)) {
    return;
  }

  navigationInitSpan = startInactiveSpan({
    name: NAVIGATION_INITIALIZATION_SPAN_NAME,
    op: 'navigation.init',
    parentSpan: extendedAppStartSpan,
  });

  listenForRunApplication();

  if (navigationReadyBeforeBegin) {
    endNavigationInitializationAppStart();
  }
}

/**
 * `AppRegistry.runApplication` makes the SDK treat the run as a remount and
 * discard the extension it has claimed, which happens whenever `Sentry.init`
 * wins the race against RN registering the root component. The discarded
 * transaction is never sent, so re-extend on the next run and rebuild the
 * child. Registered after the SDK's own reset callback, so it observes the
 * post-reset state.
 */
function listenForRunApplication(): void {
  if (isListeningForRunApplication) {
    return;
  }

  const appRegistry = getClient()?.getIntegrationByName(
    'AppRegistry',
  ) as unknown as AppRegistryIntegrationLike | undefined;

  if (!appRegistry) {
    return;
  }

  isListeningForRunApplication = true;
  appRegistry.onRunApplication(reextendAppStartAfterRunApplication);
}

function reextendAppStartAfterRunApplication(): void {
  if (hasFinished || spanIsSampled(getExtendedAppStartSpan())) {
    return;
  }

  // The child belongs to the discarded extension; drop it and start over.
  navigationInitSpan = undefined;
  beginNavigationInitializationAppStart();
}

/**
 * Ends the Navigation Initialization child and finalizes extended App Start.
 * Intended for NavigationContainer `onReady` (nav container is usable).
 */
export function endNavigationInitializationAppStart(): void {
  navigationReadyBeforeBegin = true;

  if (!navigationInitSpan || hasFinished) {
    return;
  }

  hasFinished = true;
  navigationInitSpan.end();
  navigationInitSpan = undefined;
  void finishExtendedAppStart();
}

/**
 * Test-only: restore module state between cases.
 */
export function resetNavigationInitializationAppStartForTesting(): void {
  navigationInitSpan = undefined;
  hasFinished = false;
  navigationReadyBeforeBegin = false;
  isListeningForRunApplication = false;
}
