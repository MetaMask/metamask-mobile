import {
  endTrace,
  getCachedConsent,
  getTraceContext,
  trace,
  TraceName,
  TraceOperation,
  type TraceContext,
} from '../../util/trace';
import Logger from '../../util/Logger';
import {
  beginHomepageReadyStages,
  discardHomepageReadyStages,
  finishHomepageReadyStages,
  markHomepageReadyHomeFocused,
  markHomepageReadyNavigate,
  recordHomepageReadyStage,
  startHomepageReadyStage,
  type HomepageReadyStage,
} from './homepageReadyStages';

let mockNow = 0;

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: () => mockNow },
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
  getCachedConsent: jest.fn(),
  getTraceContext: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockGetCachedConsent = jest.mocked(getCachedConsent);
const mockGetTraceContext = jest.mocked(getTraceContext);
const mockLoggerError = jest.mocked(Logger.error);

const OFFSET = 1_000_000;
const TRACE_TOKEN = 7;
const HAND_BACK_AT = 1_000;
const TAGS = {
  'unlock.before_navigate': false,
  start_source: 'unlock',
  app_start_type: 'cold',
};
const HOMEPAGE_READY_SPAN = {
  name: TraceName.HomepageReady,
} as unknown as TraceContext;

const begin = (handBackAt = HAND_BACK_AT) =>
  beginHomepageReadyStages({
    traceToken: TRACE_TOKEN,
    offset: OFFSET,
    handBackAt,
    tags: TAGS,
  });

/** Times `stage` from the current time until `end`. */
const timeStage = (stage: HomepageReadyStage, end: number) => {
  const stop = startHomepageReadyStage(stage);
  mockNow = end;
  stop();
};

const runAt = (time: number, action: () => void) => {
  mockNow = time;
  action();
};

describe('homepageReadyStages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    discardHomepageReadyStages();
    mockNow = HAND_BACK_AT;
    mockGetCachedConsent.mockReturnValue(true);
    mockGetTraceContext.mockReturnValue(HOMEPAGE_READY_SPAN);
  });

  it('adds each stage as a child of Homepage Ready and returns the durations', () => {
    begin();
    recordHomepageReadyStage('credential_decrypt', 1_000, 1_040);
    mockNow = 1_040;
    timeStage('vault_unlock', 1_500);
    timeStage('unlock_finalize', 1_600);
    runAt(1_650, markHomepageReadyNavigate);
    runAt(1_900, markHomepageReadyHomeFocused);
    mockNow = 2_400;

    const summary = finishHomepageReadyStages(TRACE_TOKEN);

    expect(summary).toEqual({
      timestamp: OFFSET + 2_400,
      data: {
        'homepage.stage.credential_decrypt_ms': 40,
        'homepage.stage.vault_unlock_ms': 460,
        'homepage.stage.unlock_finalize_ms': 100,
        'homepage.stage.home_visible_ms': 250,
        'homepage.stage.homepage_content_ms': 500,
        'homepage.unattributed_ms': 50,
      },
    });
    expect(mockGetTraceContext).toHaveBeenCalledWith({
      name: TraceName.HomepageReady,
    });
    const stages: [TraceName, number, number][] = [
      [TraceName.HomepageReadyCredentialDecrypt, 1_000, 1_040],
      [TraceName.HomepageReadyVaultUnlock, 1_040, 1_500],
      [TraceName.HomepageReadyUnlockFinalize, 1_500, 1_600],
      [TraceName.HomepageReadyHomeVisible, 1_650, 1_900],
      [TraceName.HomepageReadyHomepageContent, 1_900, 2_400],
    ];
    expect(mockTrace.mock.calls.map(([request]) => request)).toEqual(
      stages.map(([name, start]) => ({
        name,
        op: TraceOperation.HomepageReadyStage,
        id: 'homepage_ready',
        parentContext: HOMEPAGE_READY_SPAN,
        startTime: OFFSET + start,
        tags: TAGS,
      })),
    );
    expect(mockEndTrace.mock.calls.map(([request]) => request)).toEqual(
      stages.map(([name, , end]) => ({
        name,
        id: 'homepage_ready',
        timestamp: OFFSET + end,
      })),
    );
  });

  it('keeps the first record of a stage and skips incomplete or negative ones', () => {
    begin();
    recordHomepageReadyStage('submit_to_unlock', 1_000, undefined);
    recordHomepageReadyStage('seedless_password_check', undefined, 1_100);
    recordHomepageReadyStage('credential_decrypt', 1_200, 1_100);
    recordHomepageReadyStage('vault_unlock', 1_000, 1_300);
    recordHomepageReadyStage('vault_unlock', 1_000, 9_000);
    mockNow = 1_500;

    expect(finishHomepageReadyStages(TRACE_TOKEN)?.data).toEqual({
      'homepage.stage.vault_unlock_ms': 300,
      'homepage.unattributed_ms': 200,
    });
  });

  it('keeps the first stop of a stage timer', () => {
    begin();
    const stop = startHomepageReadyStage('seedless_rehydrate');
    runAt(1_300, stop);
    runAt(1_900, stop);
    mockNow = 2_000;

    expect(finishHomepageReadyStages(TRACE_TOKEN)?.data).toEqual({
      'homepage.stage.seedless_rehydrate_ms': 300,
      'homepage.unattributed_ms': 700,
    });
  });

  it('ignores a stage timer that stops after its Homepage Ready ended', () => {
    begin();
    const stop = startHomepageReadyStage('before_navigate');
    mockNow = 1_200;
    finishHomepageReadyStages(TRACE_TOKEN);
    begin(2_000);

    runAt(2_300, stop);

    expect(finishHomepageReadyStages(TRACE_TOKEN)?.data).toEqual({
      'homepage.unattributed_ms': 300,
    });
  });

  it('counts the homepage as visible only once the unlock navigated, keeping the first marks', () => {
    begin();
    runAt(1_100, markHomepageReadyHomeFocused);
    runAt(1_200, markHomepageReadyNavigate);
    runAt(1_250, markHomepageReadyNavigate);
    runAt(1_400, markHomepageReadyHomeFocused);
    runAt(1_450, markHomepageReadyHomeFocused);
    mockNow = 1_600;

    expect(finishHomepageReadyStages(TRACE_TOKEN)?.data).toEqual({
      'homepage.stage.home_visible_ms': 200,
      'homepage.stage.homepage_content_ms': 200,
      'homepage.unattributed_ms': 200,
    });
  });

  it('does nothing when no unlock began the stages', () => {
    const stop = startHomepageReadyStage('vault_unlock');
    recordHomepageReadyStage('credential_decrypt', 1_000, 1_040);
    markHomepageReadyNavigate();
    markHomepageReadyHomeFocused();
    runAt(1_500, stop);

    expect(finishHomepageReadyStages(TRACE_TOKEN)).toBeUndefined();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('returns nothing for another Homepage Ready and drops the stages', () => {
    begin();
    recordHomepageReadyStage('vault_unlock', 1_000, 1_300);

    expect(finishHomepageReadyStages(TRACE_TOKEN + 1)).toBeUndefined();
    expect(finishHomepageReadyStages(TRACE_TOKEN)).toBeUndefined();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('drops the stages of a cancelled Homepage Ready', () => {
    begin();
    recordHomepageReadyStage('vault_unlock', 1_000, 1_300);

    discardHomepageReadyStages();

    expect(finishHomepageReadyStages(TRACE_TOKEN)).toBeUndefined();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it.each([
    { consent: 'unknown', value: null },
    { consent: 'declined', value: false },
  ])(
    'returns the durations without spans while consent is $consent',
    ({ value }) => {
      mockGetCachedConsent.mockReturnValue(value);
      begin();
      recordHomepageReadyStage('vault_unlock', 1_000, 1_300);
      mockNow = 1_500;

      expect(finishHomepageReadyStages(TRACE_TOKEN)).toEqual({
        timestamp: OFFSET + 1_500,
        data: {
          'homepage.stage.vault_unlock_ms': 300,
          'homepage.unattributed_ms': 200,
        },
      });
      expect(mockTrace).not.toHaveBeenCalled();
    },
  );

  it('returns the durations without spans when Homepage Ready has no span', () => {
    mockGetTraceContext.mockReturnValue(undefined);
    begin();
    recordHomepageReadyStage('vault_unlock', 1_000, 1_300);
    mockNow = 1_500;

    expect(finishHomepageReadyStages(TRACE_TOKEN)?.data).toEqual({
      'homepage.stage.vault_unlock_ms': 300,
      'homepage.unattributed_ms': 200,
    });
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('logs instead of throwing when adding the spans fails', () => {
    const error = new Error('Sentry failed');
    mockTrace.mockImplementation(() => {
      throw error;
    });
    begin();
    recordHomepageReadyStage('vault_unlock', 1_000, 1_300);

    expect(finishHomepageReadyStages(TRACE_TOKEN)).toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      'Homepage Ready stages failed',
    );
  });
});
