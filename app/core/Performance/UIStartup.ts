import {
  TraceContext,
  TraceName,
  TraceOperation,
  trace,
} from '../../util/trace';

let UIStartupSpan: TraceContext;
let hasInitialized = false;

const getUIStartupSpan = (startTime?: number) => {
  if (!hasInitialized) {
    hasInitialized = true;
    UIStartupSpan = trace({
      name: TraceName.UIStartup,
      startTime,
      op: TraceOperation.UIStartup,
    });
  }

  return UIStartupSpan;
};

export default getUIStartupSpan;
