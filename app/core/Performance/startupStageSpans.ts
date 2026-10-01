import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import performance from 'react-native-performance';
import { getClient } from '@sentry/react-native';
import {
  getCachedConsent,
  getPerformanceTimestampOffset,
  TraceName,
  TraceOperation,
} from '../../util/trace';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import StorageWrapper from '../../store/storage-wrapper';
import { STARTUP_JS_RELOAD } from '../../constants/storage';
import Routes from '../../constants/navigation/Routes';
import type { CredentialReadTimings } from '../SecureKeychain';
import type { SeedlessPasswordCheckTimings } from '../Authentication/Authentication';
import type { PersistedStateReadStats } from '../../store/persistConfig';
import { sendFinishedTransaction } from './finishedTransaction';

/**
 * Records the startup of this JS runtime as timestamps, and emits it once as
 * `Cold Start To Unlock Ready` with one child span per stage. The stages are
 * defined in docs/performance/startup-telemetry.md.
 *
 * Every call is synchronous and never throws. Nothing is sent before metrics
 * consent, and after the one emit every call does nothing.
 */

/** Bump when the stage layout changes, so dashboards can split by it. */
const STARTUP_SCHEMA = '1';
/** A read still pending this long after the request is waiting on a prompt. */
const CREDENTIAL_READ_GRACE_MS = 2_000;
/** How long after splash gone the app may take to start waiting on the user. */
const AUTH_TIMEOUT_MS = 15_000;
/** How long a finished startup waits for Unlock To Homepage Ready before emitting. */
const LEG2_WAIT_CAP_MS = 15_000;
const HOST_SETUP_SUSPECT_MS = 30_000;
/** A reload flag older than this is left over from a reload that never happened. */
const JS_RELOAD_FLAG_MAX_AGE_MS = 60_000;
const MAX_ROUTE_CHANGES = 10;
const TOP_CONTROLLER_INITS = 8;

export type StartupKind = 'cold' | 'js_reload' | 'background_launch';
export type StartupOutcome =
  | 'completed'
  | 'new_user'
  | 'backgrounded'
  | 'auth_timeout';

/** A point on the way to the unlock, in the order startup reaches them. */
export type StartupMark =
  | 'storeInitStart'
  | 'persistStart'
  | 'persistComplete'
  | 'navInitStart'
  | 'navReady'
  | 'engineStart'
  | 'controllerStateLoaded'
  | 'engineEnd'
  | 'servicesReady'
  | 'appFirstCommit'
  | 'nativeSplashHidden'
  | 'splashGone';

export type StartupStage =
  | 'native_launch'
  | 'host_setup'
  | 'js_bundle_load'
  | 'post_bundle_gap'
  | 'store_initialization'
  | 'redux_persist_rehydration'
  | 'post_store_gap'
  | 'navigation_initialization'
  | 'controller_state_rehydration'
  | 'engine_initialization'
  | 'post_init_gap'
  | 'root_navigator_first_render'
  | 'splash_reveal_tax'
  | 'unlock_prompt_delay';

/** Numbers belong in span data, where Sentry can chart them. */
export type StartupTagValue = string | boolean;

type NativeStartupMark =
  | 'nativeLaunchStart'
  | 'nativeLaunchEnd'
  | 'runJsBundleStart'
  | 'runJsBundleEnd';

const NATIVE_MARKS: readonly NativeStartupMark[] = [
  'nativeLaunchStart',
  'nativeLaunchEnd',
  'runJsBundleStart',
  'runJsBundleEnd',
];

type StartupPoint = StartupMark | NativeStartupMark | 'awaitingUser';

interface StageDefinition {
  stage: StartupStage;
  start: StartupPoint;
  end: StartupPoint;
  /** Measured between the stages around it; only emitted when positive. */
  derived?: boolean;
  /** Before this JS runtime existed, so a JS reload has none. */
  preJs?: boolean;
  parent?: StartupStage;
}

const STAGES: readonly StageDefinition[] = [
  {
    stage: 'native_launch',
    start: 'nativeLaunchStart',
    end: 'nativeLaunchEnd',
    preJs: true,
  },
  {
    stage: 'host_setup',
    start: 'nativeLaunchEnd',
    end: 'runJsBundleStart',
    preJs: true,
  },
  {
    stage: 'js_bundle_load',
    start: 'runJsBundleStart',
    end: 'runJsBundleEnd',
    preJs: true,
  },
  {
    stage: 'post_bundle_gap',
    start: 'runJsBundleEnd',
    end: 'storeInitStart',
    derived: true,
    preJs: true,
  },
  {
    stage: 'store_initialization',
    start: 'storeInitStart',
    end: 'persistComplete',
  },
  {
    stage: 'redux_persist_rehydration',
    start: 'persistStart',
    end: 'persistComplete',
    parent: 'store_initialization',
  },
  {
    stage: 'post_store_gap',
    start: 'persistComplete',
    end: 'navInitStart',
    derived: true,
  },
  {
    stage: 'navigation_initialization',
    start: 'navInitStart',
    end: 'navReady',
  },
  {
    stage: 'controller_state_rehydration',
    start: 'engineStart',
    end: 'controllerStateLoaded',
  },
  {
    stage: 'engine_initialization',
    start: 'controllerStateLoaded',
    end: 'engineEnd',
  },
  {
    stage: 'post_init_gap',
    start: 'engineEnd',
    end: 'servicesReady',
    derived: true,
  },
  {
    stage: 'root_navigator_first_render',
    start: 'servicesReady',
    end: 'appFirstCommit',
  },
  {
    stage: 'splash_reveal_tax',
    start: 'appFirstCommit',
    end: 'splashGone',
  },
  {
    stage: 'unlock_prompt_delay',
    start: 'splashGone',
    end: 'awaitingUser',
    derived: true,
  },
];

let stageTraceNames: Record<StartupStage, TraceName> | undefined;

// Built on first use: tests that partially mock `util/trace` import this file.
const getStageTraceName = (stage: StartupStage): TraceName => {
  stageTraceNames ??= {
    native_launch: TraceName.StartupNativeLaunch,
    host_setup: TraceName.StartupHostSetup,
    js_bundle_load: TraceName.StartupJsBundleLoad,
    post_bundle_gap: TraceName.StartupPostBundleGap,
    store_initialization: TraceName.StartupStoreInitialization,
    redux_persist_rehydration: TraceName.StartupReduxPersistRehydration,
    post_store_gap: TraceName.StartupPostStoreGap,
    navigation_initialization: TraceName.StartupNavigationInitialization,
    controller_state_rehydration: TraceName.StartupControllerStateRehydration,
    engine_initialization: TraceName.StartupEngineInitialization,
    post_init_gap: TraceName.StartupPostInitGap,
    root_navigator_first_render: TraceName.StartupRootNavigatorFirstRender,
    splash_reveal_tax: TraceName.StartupSplashRevealTax,
    unlock_prompt_delay: TraceName.StartupUnlockPromptDelay,
  };
  return stageTraceNames[stage];
};

type AwaitingUserVia = 'credential_request' | 'timeout' | `route:${string}`;

/** When the app started waiting on the user. */
interface AwaitingUser {
  /** Unset when nothing resolved it before the auth timeout. */
  at?: number;
  via: AwaitingUserVia;
}

interface RouteChange {
  name: string;
  at: number;
}

interface StartupLedger {
  startedAt: number;
  startOffset: number;
  jsReload: boolean;
  /** First moment the app was seen in the foreground. */
  activeAt?: number;
  marks: Partial<Record<StartupMark, number>>;
  /** Filled in by `SecureKeychain` as the read progresses. */
  credentialRead?: CredentialReadTimings;
  routeChanges: RouteChange[];
  handBackAt?: number;
  leg2Started: boolean;
  leg2InFlight: boolean;
  seedlessPrecheckMs?: number;
  persistedState?: PersistedStateReadStats;
  controllerInits: { name: string; ms: number }[];
  stageData: Partial<Record<StartupStage, Record<string, number>>>;
  stageTags: Partial<Record<StartupStage, Record<string, StartupTagValue>>>;
  awaitingUser?: AwaitingUser;
  readyAt?: number;
}

interface EmittedStage {
  stage: StartupStage;
  start: number;
  end: number;
  parent?: StartupStage;
  tags: Record<string, StartupTagValue>;
  data: Record<string, number>;
}

/** Everything the emit needs, as raw `performance.now()` marks. */
interface StartupPayload {
  startOffset: number;
  anchorAt: number;
  endAt: number;
  tags: Record<string, StartupTagValue>;
  data: Record<string, number>;
  stages: EmittedStage[];
}

let ledger: StartupLedger | null = null;
let finishedKind: StartupKind | null = null;
let heldPayload: StartupPayload | null = null;
let evaluationTimer: ReturnType<typeof setTimeout> | null = null;
let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | undefined;

const safely = (run: () => void) => {
  try {
    run();
  } catch (error) {
    Logger.error(error as Error, 'Startup stage spans failed');
  }
};

const round = (value: number) => Math.round(value);

const consumeJsReloadFlag = (): boolean => {
  const flaggedAt = Number(StorageWrapper.getItemSync(STARTUP_JS_RELOAD));
  if (!flaggedAt) {
    return false;
  }
  StorageWrapper.removeItem(STARTUP_JS_RELOAD).catch(() => undefined);
  return Date.now() - flaggedAt < JS_RELOAD_FLAG_MAX_AGE_MS;
};

/**
 * iOS launches the app in the background for fetch and push. Android can
 * report `background` for a moment at a normal start, so a launch only counts
 * as a background launch if the app was not in the foreground before its
 * services were ready.
 */
const resolveKind = ({
  jsReload,
  activeAt,
  marks,
}: StartupLedger): StartupKind => {
  if (jsReload) {
    return 'js_reload';
  }
  const wasActive =
    activeAt !== undefined &&
    (marks.servicesReady === undefined || activeAt <= marks.servicesReady);
  return wasActive ? 'cold' : 'background_launch';
};

const clearTimers = () => {
  if (evaluationTimer !== null) {
    clearTimeout(evaluationTimer);
    evaluationTimer = null;
  }
  if (deadlineTimer !== null) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
};

const isSentryClientEnabled = () => {
  // Not `isSentryEnabled` from `util/sentry/utils`: that module imports the
  // store, which records its startup marks through this one.
  const client = getClient();
  return client !== undefined && client.getOptions().enabled !== false;
};

const emitPayload = ({
  startOffset,
  anchorAt,
  endAt,
  tags,
  data,
  stages,
}: StartupPayload) => {
  // Read now rather than at startup: uptime stops while the phone sleeps.
  const offset = getPerformanceTimestampOffset();
  const stageIndexes = new Map(
    stages.map(({ stage }, index) => [stage, index]),
  );
  sendFinishedTransaction(
    {
      name: TraceName.StartupColdStartToUnlockReady,
      op: TraceOperation.StartupColdStart,
      startTime: anchorAt + offset,
      endTime: endAt + offset,
      tags,
      data: {
        ...data,
        'startup.clock_drift_ms': round(offset - startOffset),
      },
    },
    stages.map((stage) => ({
      name: getStageTraceName(stage.stage),
      op: TraceOperation.StartupStage,
      startTime: stage.start + offset,
      endTime: stage.end + offset,
      tags: stage.tags,
      data: stage.data,
      parent: stage.parent && stageIndexes.get(stage.parent),
    })),
  );
};

/**
 * Sends the payload once consent is known to be given and Sentry is running.
 * Declined consent drops it; unknown consent keeps it for the next call.
 */
const releasePayload = () => {
  const payload = heldPayload;
  if (!payload) {
    return;
  }
  const consent = getCachedConsent();
  if (consent === false) {
    heldPayload = null;
    return;
  }
  if (consent !== true || !isSentryClientEnabled()) {
    return;
  }
  heldPayload = null;
  emitPayload(payload);
};

const readNativeMarks = (): Partial<Record<NativeStartupMark, number>> => {
  const marks: Partial<Record<NativeStartupMark, number>> = {};
  for (const name of NATIVE_MARKS) {
    const entry = performance.getEntriesByName(name).at(-1);
    if (entry) {
      marks[name] = entry.startTime;
    }
  }
  return marks;
};

interface StartupReduxFacts {
  existingUser?: boolean;
  keyringUnlocked?: boolean;
  accountCount?: number;
}

const readReduxFacts = ({ marks }: StartupLedger): StartupReduxFacts => {
  // The store exists once persist completes; asking for it earlier logs an error.
  if (marks.persistComplete === undefined) {
    return {};
  }
  const state = ReduxService.store.getState();
  const backgroundState = state.engine?.backgroundState;
  return {
    existingUser: state.user?.existingUser,
    keyringUnlocked: backgroundState?.KeyringController?.isUnlocked,
    accountCount:
      marks.engineEnd === undefined
        ? undefined
        : Object.keys(
            backgroundState?.AccountsController?.internalAccounts?.accounts ??
              {},
          ).length,
  };
};

const getCredentialReadOutcome = (read?: CredentialReadTimings) => {
  if (read?.requestedAt === undefined) {
    return 'none';
  }
  if (read.returnedAt === undefined) {
    return 'unresolved';
  }
  return read.empty ? 'empty' : 'returned';
};

const getLeg2Outcome = (
  { leg2Started }: StartupLedger,
  outcome: StartupOutcome,
  { keyringUnlocked }: StartupReduxFacts,
) => {
  if (leg2Started) {
    return 'started';
  }
  return outcome === 'completed' && keyringUnlocked
    ? 'missing'
    : 'not_applicable';
};

const getAccountBucket = (count: number) => {
  if (count <= 1) {
    return String(count);
  }
  if (count <= 5) {
    return '2-5';
  }
  if (count <= 20) {
    return '6-20';
  }
  return count <= 100 ? '21-100' : '100+';
};

const getStateSizeBucket = (chars: number) => {
  if (chars < 100_000) {
    return '<100KB';
  }
  if (chars < 1_000_000) {
    return '100KB-1MB';
  }
  if (chars < 5_000_000) {
    return '1MB-5MB';
  }
  return chars < 20_000_000 ? '5MB-20MB' : '20MB+';
};

const getPersistedStateData = (
  stats: PersistedStateReadStats | undefined,
): Record<string, number> =>
  stats
    ? {
        'startup.persisted_state.chars': stats.chars,
        'startup.persisted_state.parse_ms': round(stats.parseMs),
        'startup.persisted_state.controllers': stats.controllers,
        'startup.persisted_state.largest_chars': stats.largestChars,
      }
    : {};

/** The slowest controller inits; each includes its first `require()`. */
const getControllerInitData = (
  inits: StartupLedger['controllerInits'],
): Record<string, number> => {
  if (inits.length === 0) {
    return {};
  }
  const data: Record<string, number> = {
    'startup.engine.controllers': inits.length,
    'startup.engine.controllers_ms': round(
      inits.reduce((total, { ms }) => total + ms, 0),
    ),
  };
  for (const { name, ms } of [...inits]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, TOP_CONTROLLER_INITS)) {
    data[`startup.engine.controller.${name}_ms`] = round(ms);
  }
  return data;
};

const getStageData = (
  current: StartupLedger,
  stage: StartupStage,
): Record<string, number> => {
  const data: Record<string, number> = {};
  for (const [key, value] of Object.entries(current.stageData[stage] ?? {})) {
    data[key] = round(value);
  }
  if (stage === 'controller_state_rehydration') {
    Object.assign(data, getPersistedStateData(current.persistedState));
  }
  if (stage === 'engine_initialization') {
    Object.assign(data, getControllerInitData(current.controllerInits));
  }
  return data;
};

const getAnchorSuspect = (
  native: Partial<Record<NativeStartupMark, number>>,
  firstJsPoint: number,
): string | undefined => {
  const values = NATIVE_MARKS.map((name) => native[name]);
  if (values.includes(undefined)) {
    return 'missing_native_marks';
  }
  const ordered = [...(values as number[]), firstJsPoint];
  if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) {
    return 'native_marks_out_of_order';
  }
  const hostSetupMs =
    (native.runJsBundleStart as number) - (native.nativeLaunchEnd as number);
  return hostSetupMs > HOST_SETUP_SUSPECT_MS
    ? 'host_setup_over_30s'
    : undefined;
};

const buildPayload = (
  current: StartupLedger,
  kind: StartupKind,
  backgroundedAt: number | undefined,
): StartupPayload => {
  const { marks, awaitingUser, credentialRead } = current;
  const { splashGone } = marks;
  const facts = readReduxFacts(current);

  let outcome: StartupOutcome = 'completed';
  let endAt: number;
  let endBoundBy: 'splash' | 'awaiting_user' | 'background';
  if (awaitingUser === undefined || splashGone === undefined) {
    outcome = 'backgrounded';
    endAt = backgroundedAt ?? performance.now();
    endBoundBy = 'background';
  } else {
    if (awaitingUser.via === 'timeout') {
      outcome = 'auth_timeout';
    } else if (facts.existingUser === false) {
      outcome = 'new_user';
    }
    const awaitingUserAt = awaitingUser.at ?? splashGone;
    endAt = Math.max(splashGone, awaitingUserAt);
    endBoundBy = awaitingUserAt > splashGone ? 'awaiting_user' : 'splash';
  }

  const native = kind === 'js_reload' ? {} : readNativeMarks();
  const firstJsPoint = Math.min(current.startedAt, ...Object.values(marks));
  const anchorSuspect =
    kind === 'js_reload' ? undefined : getAnchorSuspect(native, firstJsPoint);
  const includePreJs =
    kind !== 'js_reload' && anchorSuspect !== 'missing_native_marks';
  const anchorAt =
    includePreJs && native.nativeLaunchStart !== undefined
      ? native.nativeLaunchStart
      : firstJsPoint;

  const points: Partial<Record<StartupPoint, number>> = {
    ...native,
    ...marks,
    awaitingUser: awaitingUser?.at,
  };
  const firstRoute = current.routeChanges[0];
  const legsOverlap =
    current.handBackAt !== undefined && current.handBackAt < endAt;

  const segmentTags: Record<string, StartupTagValue> = {
    'startup.schema': STARTUP_SCHEMA,
    'startup.kind': kind,
    'startup.outcome': outcome,
    'startup.legs_overlap': legsOverlap,
  };
  if (anchorSuspect) {
    segmentTags['startup.anchor_suspect'] = anchorSuspect;
  }
  if (current.persistedState) {
    segmentTags['startup.state_size_bucket'] = getStateSizeBucket(
      current.persistedState.chars,
    );
  }
  if (facts.accountCount !== undefined) {
    segmentTags['wallet.account_bucket'] = getAccountBucket(facts.accountCount);
  }

  const stages: EmittedStage[] = [];
  const stageDurations: Partial<Record<StartupStage, number>> = {};
  const openStages: StartupStage[] = [];
  const orderViolations: StartupStage[] = [];
  let previousTopLevelEnd: number | undefined;
  let attributedMs = 0;
  for (const definition of STAGES) {
    const start = points[definition.start];
    const end = points[definition.end];
    if ((definition.preJs && !includePreJs) || start === undefined) {
      continue;
    }
    if (end === undefined) {
      if (!definition.derived) {
        openStages.push(definition.stage);
      }
      continue;
    }
    if (definition.derived && end <= start) {
      stageDurations[definition.stage] = 0;
      continue;
    }
    if (end < start) {
      orderViolations.push(definition.stage);
    }
    const stageEnd = Math.max(start, end);
    if (!definition.parent) {
      if (previousTopLevelEnd !== undefined && start < previousTopLevelEnd) {
        orderViolations.push(definition.stage);
      }
      previousTopLevelEnd = stageEnd;
      attributedMs += stageEnd - start;
    }
    stageDurations[definition.stage] = stageEnd - start;
    stages.push({
      stage: definition.stage,
      start,
      end: stageEnd,
      parent: definition.parent,
      tags: { ...segmentTags, ...current.stageTags[definition.stage] },
      data: getStageData(current, definition.stage),
    });
  }

  const tags: Record<string, StartupTagValue> = {
    ...segmentTags,
    'startup.end_bound_by': endBoundBy,
    'startup.awaiting_user_via': awaitingUser?.via ?? 'none',
    'startup.credential_read': getCredentialReadOutcome(credentialRead),
    'startup.leg2': getLeg2Outcome(current, outcome, facts),
  };
  if (firstRoute) {
    tags['startup.first_route'] = firstRoute.name;
  }
  if (openStages.length > 0) {
    tags['startup.open_stages'] = openStages.join(',');
  }
  if (orderViolations.length > 0) {
    tags['startup.order_violations'] = orderViolations.join(',');
  }
  if (outcome === 'backgrounded') {
    tags['startup.backgrounded_during'] =
      credentialRead?.requestedAt !== undefined &&
      credentialRead.returnedAt === undefined
        ? 'credential_read'
        : 'startup';
  }

  const data: Record<string, number> = {
    'startup.duration_ms': round(endAt - anchorAt),
    'startup.unattributed_ms': round(endAt - anchorAt - attributedMs),
  };
  // Only measured stages, so averages skip startups that never reached one.
  for (const { stage } of STAGES) {
    const durationMs = stageDurations[stage];
    if (durationMs !== undefined) {
      data[`startup.stage.${stage}_ms`] = round(durationMs);
    }
  }
  const milestones: Record<string, number | undefined> = {
    native_splash_hidden: marks.nativeSplashHidden,
    services_ready: marks.servicesReady,
    splash_gone: splashGone,
    credential_requested: credentialRead?.requestedAt,
    awaiting_user: awaitingUser?.at,
    first_route: firstRoute?.at,
    hand_back: current.handBackAt,
  };
  for (const [milestone, at] of Object.entries(milestones)) {
    if (at !== undefined) {
      data[`startup.${milestone}_ms`] = round(at - anchorAt);
    }
  }
  if (firstRoute && splashGone !== undefined) {
    data['startup.first_route_vs_splash_ms'] = round(
      firstRoute.at - splashGone,
    );
  }
  if (
    credentialRead?.empty &&
    credentialRead.requestedAt !== undefined &&
    credentialRead.returnedAt !== undefined
  ) {
    data['startup.empty_read_ms'] = round(
      credentialRead.returnedAt - credentialRead.requestedAt,
    );
  }
  if (awaitingUser?.at !== undefined && marks.servicesReady !== undefined) {
    data['startup.auth_handoff_ms'] = round(
      awaitingUser.at - marks.servicesReady,
    );
  }
  if (current.seedlessPrecheckMs !== undefined) {
    data['startup.seedless_precheck_ms'] = round(current.seedlessPrecheckMs);
  }
  if (facts.accountCount !== undefined) {
    data['wallet.account_count'] = facts.accountCount;
  }

  return {
    startOffset: current.startOffset,
    anchorAt,
    endAt,
    tags,
    data,
    stages,
  };
};

/** Prints the stages in dev builds, so a local change can be checked without Sentry. */
const logStartupSummary = ({ tags, data, stages }: StartupPayload) => {
  if (!__DEV__) {
    return;
  }
  const lines = [
    `[startup] ${TraceName.StartupColdStartToUnlockReady}: ${data['startup.duration_ms']}ms (kind: ${tags['startup.kind']}, outcome: ${tags['startup.outcome']}, ends at: ${tags['startup.end_bound_by']})`,
    ...stages.map(
      ({ stage, start, end, parent }) =>
        `${parent ? '    ' : '  '}${stage}: ${round(end - start)}ms`,
    ),
    `  unattributed: ${data['startup.unattributed_ms']}ms`,
  ];
  Logger.log(lines.join('\n'));
};

const finish = (backgroundedAt?: number) => {
  const current = ledger;
  if (!current) {
    return;
  }
  ledger = null;
  finishedKind = resolveKind(current);
  clearTimers();
  appStateSubscription?.remove();
  appStateSubscription = undefined;
  const payload = buildPayload(current, finishedKind, backgroundedAt);
  logStartupSummary(payload);
  heldPayload = payload;
  releasePayload();
};

const onAppStateChange = (nextAppState: AppStateStatus) =>
  safely(() => {
    if (!ledger) {
      return;
    }
    if (nextAppState === 'active') {
      ledger.activeAt ??= performance.now();
    } else if (nextAppState === 'background') {
      // Android's device credential screen is its own activity, so a pending
      // read that backgrounds the app is showing a prompt.
      const requestedAt = ledger.credentialRead?.requestedAt;
      if (!ledger.awaitingUser && requestedAt !== undefined) {
        ledger.awaitingUser = { at: requestedAt, via: 'credential_request' };
      }
      finish(performance.now());
    }
  });

const ensureLedger = (): StartupLedger | null => {
  if (finishedKind !== null) {
    return null;
  }
  if (!ledger) {
    const startedAt = performance.now();
    ledger = {
      startedAt,
      startOffset: getPerformanceTimestampOffset(),
      jsReload: consumeJsReloadFlag(),
      activeAt: AppState.currentState === 'active' ? startedAt : undefined,
      marks: {},
      routeChanges: [],
      leg2Started: false,
      leg2InFlight: false,
      controllerInits: [],
      stageData: {},
      stageTags: {},
    };
    appStateSubscription = AppState.addEventListener(
      'change',
      onAppStateChange,
    );
  }
  return ledger;
};

type AwaitingUserResolution = AwaitingUser | { retryAt?: number };

/**
 * The credential request is where a prompt can appear, so it is the moment the
 * app starts waiting on the user, unless the read came back empty: an empty
 * read cannot have prompted, and the route change that follows it (to Login)
 * is the moment instead.
 */
const resolveAwaitingUser = (
  { credentialRead, routeChanges }: StartupLedger,
  now: number,
): AwaitingUserResolution => {
  const requestedAt = credentialRead?.requestedAt;
  if (credentialRead && requestedAt !== undefined) {
    const request: AwaitingUser = {
      at: requestedAt,
      via: 'credential_request',
    };
    const { returnedAt } = credentialRead;
    if (returnedAt === undefined) {
      const graceEnd = requestedAt + CREDENTIAL_READ_GRACE_MS;
      return now >= graceEnd ? request : { retryAt: graceEnd };
    }
    if (!credentialRead.empty) {
      return request;
    }
    const route = routeChanges.find(({ at }) => at >= returnedAt);
    if (route) {
      return { at: route.at, via: `route:${route.name}` };
    }
    const graceEnd = returnedAt + CREDENTIAL_READ_GRACE_MS;
    return now >= graceEnd ? request : { retryAt: graceEnd };
  }
  const [firstRoute] = routeChanges;
  return firstRoute
    ? { at: firstRoute.at, via: `route:${firstRoute.name}` }
    : {};
};

/** Unlock To Homepage Ready is in flight, or a returned password will start it. */
const isLeg2Pending = ({
  leg2InFlight,
  credentialRead,
  handBackAt,
}: StartupLedger) =>
  leg2InFlight ||
  (credentialRead?.returnedAt !== undefined &&
    !credentialRead.empty &&
    handBackAt === undefined);

const setDeadline = (at: number | undefined) => {
  if (deadlineTimer !== null) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
  if (at === undefined) {
    return;
  }
  deadlineTimer = setTimeout(
    () => {
      deadlineTimer = null;
      safely(() => evaluate(at));
    },
    Math.max(0, at - performance.now()),
  );
};

/**
 * Emits once both splash gone and awaiting user are known. While an unlock is
 * on its way to the homepage it waits for it, so the emit has the hand-back
 * and its work is not part of what Unlock To Homepage Ready and Homepage
 * Ready measure.
 *
 * @param deadlineAt - The deadline whose timer called this. It counts as
 * reached even if the clock reads slightly earlier, so the timer is not set again.
 */
function evaluate(deadlineAt?: number) {
  const current = ledger;
  if (!current) {
    return;
  }
  const now = Math.max(performance.now(), deadlineAt ?? -Infinity);
  const deadlines: number[] = [];
  if (!current.awaitingUser) {
    const resolution = resolveAwaitingUser(current, now);
    if ('via' in resolution) {
      current.awaitingUser = resolution;
    } else if (resolution.retryAt !== undefined) {
      deadlines.push(resolution.retryAt);
    }
  }
  const { splashGone } = current.marks;
  if (splashGone !== undefined && !current.awaitingUser) {
    const timeoutAt = splashGone + AUTH_TIMEOUT_MS;
    if (now >= timeoutAt) {
      current.awaitingUser = { via: 'timeout' };
    } else {
      deadlines.push(timeoutAt);
    }
  }
  if (splashGone !== undefined && current.awaitingUser) {
    current.readyAt ??= now;
    const waitUntil = current.readyAt + LEG2_WAIT_CAP_MS;
    if (!isLeg2Pending(current) || now >= waitUntil) {
      finish();
      return;
    }
    deadlines.push(waitUntil);
  }
  setDeadline(deadlines.length > 0 ? Math.min(...deadlines) : undefined);
}

/** Deferred, so an unlock can note its hand-back before startup is judged. */
const scheduleEvaluation = () => {
  if (evaluationTimer !== null || finishedKind !== null) {
    return;
  }
  evaluationTimer = setTimeout(() => {
    evaluationTimer = null;
    safely(() => evaluate());
  }, 0);
};

/** Records the first time startup reaches `mark`. */
export const markStartup = (mark: StartupMark) =>
  safely(() => {
    const current = ensureLedger();
    if (!current || current.marks[mark] !== undefined) {
      return;
    }
    current.marks[mark] = performance.now();
    if (mark === 'splashGone') {
      scheduleEvaluation();
    }
  });

/**
 * Keeps the timings of the startup's credential read. `SecureKeychain` fills
 * them in later, and they are read when resolving awaiting user.
 */
export const noteStartupCredentialRequest = (timings: CredentialReadTimings) =>
  safely(() => {
    const current = ensureLedger();
    if (
      !current ||
      current.credentialRead ||
      timings.requestedAt === undefined
    ) {
      return;
    }
    current.credentialRead = timings;
    scheduleEvaluation();
  });

/** @param focusedRouteNames - Focused route names, root to leaf. */
export const noteStartupRouteChange = (focusedRouteNames: readonly string[]) =>
  safely(() => {
    const current = ensureLedger();
    // The app flow's routes sit under the navigation provider's own screen.
    const route = focusedRouteNames[1];
    if (
      !current ||
      route === undefined ||
      focusedRouteNames.includes(Routes.FOX_LOADER) ||
      current.routeChanges.length >= MAX_ROUTE_CHANGES ||
      current.routeChanges.at(-1)?.name === route
    ) {
      return;
    }
    current.routeChanges.push({ name: route, at: performance.now() });
    scheduleEvaluation();
  });

/**
 * @param handBackAt - `performance.now()` when the unlock had its password.
 * @param leg2 - Whether Unlock To Homepage Ready started, and whether it is in flight.
 */
export const noteStartupHandBack = (
  handBackAt: number,
  {
    leg2Started,
    leg2InFlight,
  }: { leg2Started: boolean; leg2InFlight: boolean },
) =>
  safely(() => {
    const current = ensureLedger();
    if (!current) {
      return;
    }
    current.handBackAt ??= handBackAt;
    current.leg2Started ||= leg2Started;
    current.leg2InFlight = leg2InFlight;
    scheduleEvaluation();
  });

export const noteStartupLeg2Ended = () =>
  safely(() => {
    if (!ledger?.leg2InFlight) {
      return;
    }
    ledger.leg2InFlight = false;
    scheduleEvaluation();
  });

/** The saga's seedless check, which runs before the credential request. */
export const noteStartupSeedlessPrecheck = ({
  startedAt,
  endedAt,
}: SeedlessPasswordCheckTimings) =>
  safely(() => {
    const current = ensureLedger();
    if (
      !current ||
      current.seedlessPrecheckMs !== undefined ||
      startedAt === undefined ||
      endedAt === undefined
    ) {
      return;
    }
    current.seedlessPrecheckMs = endedAt - startedAt;
  });

export const setStartupPersistedStateStats = (stats: PersistedStateReadStats) =>
  safely(() => {
    const current = ensureLedger();
    if (!current || current.persistedState) {
      return;
    }
    current.persistedState = { ...stats };
    if (stats.largestController) {
      const tags = (current.stageTags.controller_state_rehydration ??= {});
      tags['startup.persisted_state.largest_controller'] ??=
        stats.largestController;
    }
  });

/** Times one controller's init while startup's `EngineService.start` runs. */
export const noteStartupControllerInit = (name: string, durationMs: number) =>
  safely(() => {
    if (
      ledger?.marks.engineStart === undefined ||
      ledger.marks.engineEnd !== undefined
    ) {
      return;
    }
    ledger.controllerInits.push({ name, ms: durationMs });
  });

/** Adds a number to a stage's span. The first value for a key wins. */
export const setStartupStageData = (
  stage: StartupStage,
  key: string,
  value: number,
) =>
  safely(() => {
    const current = ensureLedger();
    if (current) {
      const data = (current.stageData[stage] ??= {});
      data[key] ??= value;
    }
  });

/** Adds a string or boolean to a stage's span. The first value for a key wins. */
export const setStartupStageTag = (
  stage: StartupStage,
  key: string,
  value: StartupTagValue,
) =>
  safely(() => {
    const current = ensureLedger();
    if (current) {
      const tags = (current.stageTags[stage] ??= {});
      tags[key] ??= value;
    }
  });

/**
 * Starts timing one step inside a stage.
 *
 * @returns Stops the timer and records the step as `key` on the stage.
 */
export const timeStartupStep = (stage: StartupStage, key: string) => {
  const startedAt = performance.now();
  return () => setStartupStageData(stage, key, performance.now() - startedAt);
};

/** The kind of this JS runtime's startup, so later spans can exclude reloads and background launches. */
export const getStartupKind = (): StartupKind =>
  finishedKind ?? (ledger ? resolveKind(ledger) : 'cold');

/**
 * Call just before reloading the JS bundle in place: the next runtime's
 * native marks still point at the original process start.
 */
export const flagNextStartupAsJsReload = () =>
  safely(() => {
    StorageWrapper.setItem(STARTUP_JS_RELOAD, String(Date.now())).catch(
      () => undefined,
    );
  });

/** Sends a held startup once Sentry is set up. Safe to call more than once. */
export const flushStartupStageSpans = () => safely(releasePayload);

export const resetStartupStageSpansForTesting = () => {
  clearTimers();
  appStateSubscription?.remove();
  appStateSubscription = undefined;
  ledger = null;
  finishedKind = null;
  heldPayload = null;
};
