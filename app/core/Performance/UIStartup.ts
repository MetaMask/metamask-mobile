import {
  TraceContext,
  TraceName,
  TraceOperation,
  trace,
} from '../../util/trace';

let UIStartupSpan: TraceContext;

const getUIStartupSpan = (startTime?: number) => {
  if (!UIStartupSpan) {
    UIStartupSpan = trace({
      name: TraceName.UIStartup,
      startTime,
      op: TraceOperation.UIStartup,
    });
  }

  return UIStartupSpan;
};

export default getUIStartupSpan;
