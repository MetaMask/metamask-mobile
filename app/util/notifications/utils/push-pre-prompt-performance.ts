import Logger from '../../Logger';

export interface PushPrePromptPerformanceEvent {
  data?: Record<string, unknown>;
  name: string;
  sequence: number;
  sinceStartMs: number;
  timestamp: number;
}

export interface PushPrePromptPerformanceTools {
  clear: () => void;
  getEvents: () => PushPrePromptPerformanceEvent[];
  getReport: () => string;
  logReport: () => void;
}

const LOG_PREFIX = '[PushPrePromptPerformance]';
const MAX_EVENTS = 200;

let firstTimestamp: number | null = null;
let sequence = 0;
let events: PushPrePromptPerformanceEvent[] = [];

const isEnabled = () =>
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.PUSH_PRE_PROMPT_PERF_LOGGING === 'true';

const shouldLog = () => isEnabled() && !process.env.JEST_WORKER_ID;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const clearPushPrePromptPerformanceEvents = () => {
  firstTimestamp = null;
  sequence = 0;
  events = [];
  if (shouldLog()) {
    Logger.log(LOG_PREFIX, 'cleared');
  }
};

export const getPushPrePromptPerformanceEvents = () => [...events];

const getReportEvents = () =>
  events.map(({ data, name, sequence: eventSequence, sinceStartMs }) => ({
    ...data,
    name,
    sequence: eventSequence,
    sinceStartMs,
  }));

export const getPushPrePromptPerformanceReport = () =>
  JSON.stringify(
    {
      eventCount: events.length,
      events: getReportEvents(),
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );

export const markPushPrePromptPerformance = (
  name: string,
  data?: Record<string, unknown>,
) => {
  if (!isEnabled()) {
    return;
  }

  const timestamp = Date.now();
  firstTimestamp ??= timestamp;

  const event: PushPrePromptPerformanceEvent = {
    data,
    name,
    sequence: sequence + 1,
    sinceStartMs: timestamp - firstTimestamp,
    timestamp,
  };

  sequence += 1;
  events = [...events.slice(-(MAX_EVENTS - 1)), event];

  if (shouldLog()) {
    Logger.log(LOG_PREFIX, event);
  }
};

export const measurePushPrePromptPerformance = async <T>(
  name: string,
  operation: () => Promise<T>,
  data?: Record<string, unknown>,
): Promise<T> => {
  if (!isEnabled()) {
    return operation();
  }

  const start = Date.now();
  markPushPrePromptPerformance(`${name}.start`, data);

  try {
    const result = await operation();
    markPushPrePromptPerformance(`${name}.end`, {
      ...data,
      durationMs: Date.now() - start,
      success: true,
    });
    return result;
  } catch (error) {
    markPushPrePromptPerformance(`${name}.end`, {
      ...data,
      durationMs: Date.now() - start,
      error: getErrorMessage(error),
      success: false,
    });
    throw error;
  }
};

export const logPushPrePromptPerformanceReport = () => {
  if (!isEnabled()) {
    return;
  }

  Logger.log(LOG_PREFIX, 'report', getReportEvents());
};

const installDevTools = () => {
  if (!isEnabled()) {
    return;
  }

  const globalWithTools = globalThis as typeof globalThis & {
    __pushPrePromptPerformance?: PushPrePromptPerformanceTools;
  };

  globalWithTools.__pushPrePromptPerformance = {
    clear: clearPushPrePromptPerformanceEvents,
    getEvents: getPushPrePromptPerformanceEvents,
    getReport: getPushPrePromptPerformanceReport,
    logReport: logPushPrePromptPerformanceReport,
  };
};

installDevTools();
