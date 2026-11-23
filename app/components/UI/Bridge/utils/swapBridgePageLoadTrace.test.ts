import { trace, TraceName } from '../../../../util/trace';
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults app_start_type to warm', () => {
    startSwapBridgePageLoadTrace(route);

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SwapViewLoaded,
        data: expect.objectContaining({ app_start_type: 'warm' }),
      }),
    );
  });

  it('sets app_start_type to cold when requested', () => {
    startSwapBridgePageLoadTrace(route, { appStartType: 'cold' });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_start_type: 'cold' }),
      }),
    );
  });
});
