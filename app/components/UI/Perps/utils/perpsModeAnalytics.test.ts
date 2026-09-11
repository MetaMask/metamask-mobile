import { DEFAULT_PERPS_MODE, PerpsMode } from '@metamask/perps-controller';
import {
  getPerpsModeAnalyticsProperties,
  PERPS_MODE_ANALYTICS_PROPERTY,
} from './perpsModeAnalytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

const mockSelectPerpsMode = jest.fn((_state?: unknown) => PerpsMode.Pro);
const mockGetState = jest.fn(() => ({}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsMode: (state: unknown) => mockSelectPerpsMode(state),
}));

describe('getPerpsModeAnalyticsProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current Lite/Pro mode from the selector', () => {
    mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);

    expect(getPerpsModeAnalyticsProperties()).toEqual({
      [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
    });
    expect(mockSelectPerpsMode).toHaveBeenCalledWith(mockGetState());
  });

  it('falls back to DEFAULT_PERPS_MODE and logs when lookup fails', () => {
    mockSelectPerpsMode.mockImplementation(() => {
      throw new Error('store unavailable');
    });

    expect(getPerpsModeAnalyticsProperties()).toEqual({
      [PERPS_MODE_ANALYTICS_PROPERTY]: DEFAULT_PERPS_MODE,
    });
    expect(DevLogger.log).toHaveBeenCalled();
  });
});
