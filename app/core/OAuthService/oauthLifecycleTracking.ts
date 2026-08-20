import StorageWrapper from '../../store/storage-wrapper';
import { OAUTH_IN_PROGRESS } from '../../constants/storage';

export const OAUTH_RESUME_OUTCOME = {
  SUCCESS: 'success',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
  PROCESS_RESTARTED: 'process_restarted',
  ABANDONED: 'abandoned',
} as const;

export type OAuthResumeOutcome =
  (typeof OAUTH_RESUME_OUTCOME)[keyof typeof OAUTH_RESUME_OUTCOME];

export interface OAuthBackgroundAnalyticsProperties {
  had_background_during_oauth: boolean;
  background_count: number;
  time_in_background_ms: number;
  resume_outcome?: OAuthResumeOutcome;
}

interface PersistedOAuthInProgress {
  authConnection: string;
  startedAt: number;
}

interface OAuthLifecycleState {
  inProgress: boolean;
  authConnection?: string;
  startedAt?: number;
  backgroundCount: number;
  totalBackgroundMs: number;
  lastBackgroundedAt?: number;
  resumeOutcome?: OAuthResumeOutcome;
}

const createDefaultState = (): OAuthLifecycleState => ({
  inProgress: false,
  backgroundCount: 0,
  totalBackgroundMs: 0,
});

let lifecycleState: OAuthLifecycleState = createDefaultState();

export function getOAuthBackgroundAnalyticsProperties(): OAuthBackgroundAnalyticsProperties {
  return {
    had_background_during_oauth: lifecycleState.backgroundCount > 0,
    background_count: lifecycleState.backgroundCount,
    time_in_background_ms: lifecycleState.totalBackgroundMs,
    ...(lifecycleState.resumeOutcome && {
      resume_outcome: lifecycleState.resumeOutcome,
    }),
  };
}

export function isOAuthLifecycleInProgress(): boolean {
  return lifecycleState.inProgress;
}

export function getOAuthLifecycleAuthConnection(): string | undefined {
  return lifecycleState.authConnection;
}

export async function startOAuthLifecycleTracking(
  authConnection: string,
): Promise<void> {
  lifecycleState = {
    inProgress: true,
    authConnection,
    startedAt: Date.now(),
    backgroundCount: 0,
    totalBackgroundMs: 0,
  };

  const persisted: PersistedOAuthInProgress = {
    authConnection,
    startedAt: lifecycleState.startedAt,
  };
  await StorageWrapper.setItem(OAUTH_IN_PROGRESS, JSON.stringify(persisted));
}

export function recordOAuthBackgrounded(): void {
  if (!lifecycleState.inProgress) {
    return;
  }
  lifecycleState.lastBackgroundedAt = Date.now();
}

export function recordOAuthResumed(): void {
  if (
    !lifecycleState.inProgress ||
    lifecycleState.lastBackgroundedAt === undefined
  ) {
    return;
  }

  lifecycleState.backgroundCount += 1;
  lifecycleState.totalBackgroundMs +=
    Date.now() - lifecycleState.lastBackgroundedAt;
  lifecycleState.lastBackgroundedAt = undefined;
}

export async function finalizeOAuthLifecycle(
  outcome: OAuthResumeOutcome,
): Promise<OAuthBackgroundAnalyticsProperties> {
  if (lifecycleState.lastBackgroundedAt !== undefined) {
    recordOAuthResumed();
  }

  lifecycleState.resumeOutcome = outcome;
  const properties = getOAuthBackgroundAnalyticsProperties();
  lifecycleState = createDefaultState();
  await StorageWrapper.removeItem(OAUTH_IN_PROGRESS);
  return properties;
}

export async function detectOAuthProcessRestart(): Promise<{
  detected: boolean;
  authConnection?: string;
  analyticsProperties?: OAuthBackgroundAnalyticsProperties;
}> {
  const raw = await StorageWrapper.getItem(OAUTH_IN_PROGRESS);
  if (!raw) {
    return { detected: false };
  }

  if (lifecycleState.inProgress) {
    return { detected: false };
  }

  let parsed: PersistedOAuthInProgress;
  try {
    parsed = JSON.parse(raw) as PersistedOAuthInProgress;
  } catch {
    await StorageWrapper.removeItem(OAUTH_IN_PROGRESS);
    return { detected: false };
  }

  await StorageWrapper.removeItem(OAUTH_IN_PROGRESS);

  const analyticsProperties: OAuthBackgroundAnalyticsProperties = {
    had_background_during_oauth: false,
    background_count: 0,
    time_in_background_ms: 0,
    resume_outcome: OAUTH_RESUME_OUTCOME.PROCESS_RESTARTED,
  };

  return {
    detected: true,
    authConnection: parsed.authConnection,
    analyticsProperties,
  };
}

export function resetOAuthLifecycleTrackingForTests(): void {
  lifecycleState = createDefaultState();
}
