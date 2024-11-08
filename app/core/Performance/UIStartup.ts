import { TraceContext, TraceName, trace } from '../../util/trace';

let UIStartupSpan: TraceContext;

const getUIStartupSpan = (startTime?: number) => {
  if (!UIStartupSpan) {
    UIStartupSpan = trace({ name: TraceName.UIStartup, startTime });
  }

  return UIStartupSpan;
};

export default getUIStartupSpan;
