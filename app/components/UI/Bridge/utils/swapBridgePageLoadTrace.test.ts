import { trace } from '../../../../util/trace';
import { BridgeViewMode } from '../types';
import { startSwapBridgePageLoadTrace } from './swapBridgePageLoadTrace';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
}));

const route = {
  sourcePage: 'deeplink',
  bridgeViewMode: BridgeViewMode.Unified,
};

describe('startSwapBridgePageLoadTrace', () => {
  it.each([
    [undefined, 'warm'],
    ['cold', 'cold'],
  ] as const)('tags app_start_type %s as %s', (appStartType, expected) => {
    startSwapBridgePageLoadTrace(route, { appStartType });

    expect(trace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_start_type: expected }),
      }),
    );
  });
});
