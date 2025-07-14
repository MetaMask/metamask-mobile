import { BufferedTraceActionType } from '../../reducers/bufferedTraces';
import type { BufferedTrace } from '../../reducers/bufferedTraces';

export const addBufferedTrace = (trace: BufferedTrace) => ({
  type: BufferedTraceActionType.ADD_BUFFERED_TRACE,
  payload: {
    trace,
  },
});

export const clearBufferedTraces = () => ({
  type: BufferedTraceActionType.CLEAR_BUFFERED_TRACES,
});
