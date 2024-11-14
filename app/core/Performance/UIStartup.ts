import { getTraceTags } from '../../util/sentry/tags';
import {
  TraceContext,
  TraceName,
  TraceOperation,
  trace,
} from '../../util/trace';
import { store } from '../../store';

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
