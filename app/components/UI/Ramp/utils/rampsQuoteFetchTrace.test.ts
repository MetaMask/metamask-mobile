import { trace, endTrace, TraceName } from '../../../../util/trace';
import {
  startRampsQuoteFetchTrace,
  endRampsQuoteFetchTrace,
  buildRampsQuoteFetchStartTags,
  buildRampsQuoteFetchCompletion,
  resetRampsQuoteFetchTraceForTests,
} from './rampsQuoteFetchTrace';
import {
  RAMPS_QUOTE_FETCH_END_REASON,
  RAMPS_QUOTE_FETCH_FEATURE,
  RAMPS_QUOTE_FETCH_PATH,
  RAMPS_QUOTE_FETCH_RAMP_TYPE,
  RAMPS_QUOTE_FETCH_TAG,
} from '../constants/rampsQuoteFetchTags';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;

describe('rampsQuoteFetchTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRampsQuoteFetchTraceForTests();
  });

  it('starts a RampQuoteLoading span with buy / UB2 tags', () => {
    const opId = startRampsQuoteFetchTrace({
      tags: { [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal' },
    });

    expect(opId).toContain(TraceName.RampQuoteLoading);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampQuoteLoading,
        id: opId,
        tags: {
          [RAMPS_QUOTE_FETCH_TAG.FEATURE]: RAMPS_QUOTE_FETCH_FEATURE,
          [RAMPS_QUOTE_FETCH_TAG.RAMP_TYPE]: RAMPS_QUOTE_FETCH_RAMP_TYPE,
          [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal',
        },
      }),
    );
  });

  it('supersedes a prior open quote fetch', () => {
    const first = startRampsQuoteFetchTrace();
    const second = startRampsQuoteFetchTrace();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampQuoteLoading,
        id: first,
        data: {
          [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
          [RAMPS_QUOTE_FETCH_TAG.REASON]:
            RAMPS_QUOTE_FETCH_END_REASON.SUPERSEDED,
        },
      }),
    );
    expect(second).not.toEqual(first);
  });

  it('ends completions by op id and ignores unknown ids', () => {
    const opId = startRampsQuoteFetchTrace();
    endRampsQuoteFetchTrace({
      id: opId,
      data: { [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: true },
    });
    endRampsQuoteFetchTrace({
      id: opId,
      data: { [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false },
    });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampQuoteLoading,
        id: opId,
        data: { [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: true },
      }),
    );
  });

  describe('provider attribution (TRAM-3805)', () => {
    it('tags single-provider starts with the provider id', () => {
      expect(buildRampsQuoteFetchStartTags(['/providers/paypal'])).toEqual({
        [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal',
      });
      expect(
        buildRampsQuoteFetchStartTags([
          '/providers/paypal',
          '/providers/transak',
        ]),
      ).toBeUndefined();
    });

    it('marks PayPal custom-action quotes as successful custom_action path', () => {
      expect(
        buildRampsQuoteFetchCompletion({
          isQueryError: false,
          requestedProviders: ['/providers/paypal'],
          response: {
            success: [
              {
                provider: '/providers/paypal',
                quote: { isCustomAction: true },
              },
            ],
          },
        }),
      ).toEqual({
        [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: true,
        [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal',
        [RAMPS_QUOTE_FETCH_TAG.PATH]: RAMPS_QUOTE_FETCH_PATH.CUSTOM_ACTION,
        [RAMPS_QUOTE_FETCH_TAG.CUSTOM_ACTION]: true,
      });
    });

    it('marks HTTP-ok PayPal misses as no_quote failures', () => {
      expect(
        buildRampsQuoteFetchCompletion({
          isQueryError: false,
          requestedProviders: ['/providers/paypal'],
          response: { success: [] },
        }),
      ).toEqual({
        [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
        [RAMPS_QUOTE_FETCH_TAG.REASON]: RAMPS_QUOTE_FETCH_END_REASON.NO_QUOTE,
        [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal',
      });
    });

    it('keeps transport errors as error failures with provider tag', () => {
      expect(
        buildRampsQuoteFetchCompletion({
          isQueryError: true,
          requestedProviders: ['/providers/paypal'],
          response: null,
        }),
      ).toEqual({
        [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
        [RAMPS_QUOTE_FETCH_TAG.REASON]: RAMPS_QUOTE_FETCH_END_REASON.ERROR,
        [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: '/providers/paypal',
      });
    });
  });
});
