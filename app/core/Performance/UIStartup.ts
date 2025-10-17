import {
  TraceContext,
  TraceName,
  TraceOperation,
  trace,
} from '../../util/trace';

let UIStartupSpan: TraceContext | null = null;

const getUIStartupSpan = (startTime?: number) => {
  if (UIStartupSpan === null) {
    UIStartupSpan = trace({
      name: TraceName.UIStartup,
      startTime,
      op: TraceOperation.UIStartup,
    });
  }

  return UIStartupSpan;
};

export default getUIStartupSpan;
