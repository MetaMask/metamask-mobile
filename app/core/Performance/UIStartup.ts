import {
  TraceContext,
  TraceName,
  TraceOperation,
  trace,
} from '../../util/trace';
import { markPreUnlockMilestone } from '../../util/startup/preUnlockStartupTelemetry';

let UIStartupSpan: TraceContext | null = null;

const getUIStartupSpan = (startTime?: number) => {
  if (UIStartupSpan === null) {
    UIStartupSpan = trace({
      name: TraceName.UIStartup,
      startTime,
      op: TraceOperation.UIStartup,
    });
    markPreUnlockMilestone('M0');
  }

  return UIStartupSpan;
};

export default getUIStartupSpan;
