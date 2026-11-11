import {
  endTrace,
  trace,
  type TraceName,
  type TraceOperation,
} from '../../../../util/trace';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';
import { withPredictNextTrace } from './withPredictNextTrace';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const TRACE_NAME = 'PredictNext Get Events' as TraceName;
const TRACE_OPERATION = 'predict.data_fetch' as TraceOperation;

describe('withPredictNextTrace', () => {
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the function result and ends the trace with success data', async () => {
    const result = { items: 2 };
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000);

    const output = await withPredictNextTrace(
      {
        method: 'getEvents',
        name: TRACE_NAME,
        op: TRACE_OPERATION,
        tags: { venueId: 'kalshi' },
        data: { hasCursor: false },
        resultData: (value) => ({ itemCount: value.items }),
      },
      async () => result,
    );

    expect(output).toEqual(result);
    expect(mockTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      op: TRACE_OPERATION,
      id: 'getEvents-1000',
      tags: { feature: PREDICT_NEXT_FEATURE_NAME, venueId: 'kalshi' },
      data: { hasCursor: false },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getEvents-1000',
      data: { success: true, itemCount: 2 },
    });
  });

  it('re-throws errors and ends the trace with failure data', async () => {
    const thrownError = new Error('network failed');
    jest.spyOn(Date, 'now').mockReturnValueOnce(2000);

    await expect(
      withPredictNextTrace(
        {
          method: 'getVenueStatus',
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        async () => {
          throw thrownError;
        },
      ),
    ).rejects.toBe(thrownError);

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getVenueStatus-2000',
      data: { success: false, error: 'network failed' },
    });
  });

  it('ends the trace when the function throws a non-Error value', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(3000);

    await expect(
      withPredictNextTrace(
        {
          method: 'getEvent',
          name: TRACE_NAME,
          op: TRACE_OPERATION,
        },
        async () => {
          throw 'boom';
        },
      ),
    ).rejects.toBe('boom');

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TRACE_NAME,
      id: 'getEvent-3000',
      data: { success: false, error: 'Unknown error' },
    });
  });
});
