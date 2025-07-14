import type { Event as SentryEvent } from '@sentry/react-native';
import { EndTraceRequest, TraceRequest } from '../../util/trace';

export interface BufferedTrace<T = TraceRequest | EndTraceRequest> {
  type: 'start' | 'end';
  request: T;
  parentTraceName?: string; // Track parent trace name for reconnecting during flush
}

export interface BufferedTraceState {
  bufferedTraces: BufferedTrace[];
}

export const initialState: BufferedTraceState = {
  bufferedTraces: [],
};

export enum BufferedTraceActionType {
  ADD_BUFFERED_TRACE = 'ADD_BUFFERED_TRACE',
  CLEAR_BUFFERED_TRACES = 'CLEAR_BUFFERED_TRACES',
}

export interface AddBufferedTraceAction {
  type: BufferedTraceActionType.ADD_BUFFERED_TRACE;
  payload: {
    trace: SentryEvent;
  };
}

export interface ClearBufferedTracesAction {
  type: BufferedTraceActionType.CLEAR_BUFFERED_TRACES;
}

export type BufferedTraceAction =
  | AddBufferedTraceAction
  | ClearBufferedTracesAction;

/* eslint-disable @typescript-eslint/default-param-last */
const bufferedTracesReducer = (
  state: BufferedTraceState = initialState,
  action: BufferedTraceAction,
): BufferedTraceState => {
  switch (action.type) {
    case BufferedTraceActionType.ADD_BUFFERED_TRACE:
      return {
        ...state,
        bufferedTraces: [...state.bufferedTraces, action.payload.trace],
      };
    case BufferedTraceActionType.CLEAR_BUFFERED_TRACES:
      return {
        ...state,
        bufferedTraces: [],
      };
    default:
      return state;
  }
};

export default bufferedTracesReducer;
