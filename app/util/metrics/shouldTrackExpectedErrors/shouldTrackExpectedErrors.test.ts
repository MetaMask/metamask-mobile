import { shouldTrackExpectedErrors } from './shouldTrackExpectedErrors';
import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { getAnalyticsId } from '../getAnalyticsId';

// Mock the remote-feature-flag-controller module
jest.mock('@metamask/remote-feature-flag-controller', () => ({
  generateDeterministicRandomNumber: jest.fn(),
}));

// Mock getAnalyticsId helper
jest.mock('../getAnalyticsId', () => ({
  getAnalyticsId: jest.fn(),
}));

// 01c53eb9-aeb9-4cd1-9414-7194419fe88b = 0.006915
// f9d8dd0a-5851-45b5-aed7-8c45e5910375 = 0.975965
const TEST_IDS = {
  UNDER_ONE_PERCENT: '01c53eb9-aeb9-4cd1-9414-7194419fe88b',
  OVER_NINETY_SEVEN_PERCENT: 'f9d8dd0a-5851-45b5-aed7-8c45e5910375',
};

const constantMock = jest.requireMock('./constants');
jest.mock('./constants', () => ({
  EXPECTED_ERRORS_PORTION_TO_TRACK: 0.5,
}));

const mockGetAnalyticsId = getAnalyticsId as jest.MockedFunction<
  typeof getAnalyticsId
>;

describe('shouldTrackExpectedErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when error should be tracked', async () => {
    // mock EXPECTED_ERRORS_PORTION_TO_TRACK to be 0.01
    constantMock.EXPECTED_ERRORS_PORTION_TO_TRACK = 0.01;
    // mock getAnalyticsId to return the test id UNDER_ONE_PERCENT
    mockGetAnalyticsId.mockResolvedValue(TEST_IDS.UNDER_ONE_PERCENT);

    // Mock the return value for this specific test
    (generateDeterministicRandomNumber as jest.Mock).mockReturnValue(0.006915);

    const result = await shouldTrackExpectedErrors();

    expect(mockGetAnalyticsId).toHaveBeenCalled();
    expect(generateDeterministicRandomNumber).toHaveBeenCalledWith(
      TEST_IDS.UNDER_ONE_PERCENT,
    );
    expect(result).toBe(true);
  });

  it('returns false when error should not be tracked', async () => {
    // mock EXPECTED_ERRORS_PORTION_TO_TRACK to be 0.01
    constantMock.EXPECTED_ERRORS_PORTION_TO_TRACK = 0.01;
    // mock getAnalyticsId to return the test id OVER_NINETY_SEVEN_PERCENT
    mockGetAnalyticsId.mockResolvedValue(TEST_IDS.OVER_NINETY_SEVEN_PERCENT);
    // Mock the return value for this specific test
    (generateDeterministicRandomNumber as jest.Mock).mockReturnValue(0.975965);

    const result = await shouldTrackExpectedErrors();

    expect(mockGetAnalyticsId).toHaveBeenCalled();
    expect(generateDeterministicRandomNumber).toHaveBeenCalledWith(
      TEST_IDS.OVER_NINETY_SEVEN_PERCENT,
    );
    expect(result).toBe(false);
  });

  it('returns false when analyticsId is empty string', async () => {
    mockGetAnalyticsId.mockResolvedValue('');
    // reset mock for generateDeterministicRandomNumber
    (generateDeterministicRandomNumber as jest.Mock).mockReset();

    const result = await shouldTrackExpectedErrors();

    // Should return false without calling generateDeterministicRandomNumber
    expect(generateDeterministicRandomNumber).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('returns false when getAnalyticsId throws an error', async () => {
    mockGetAnalyticsId.mockRejectedValue(new Error('Get analytics ID error'));

    const result = await shouldTrackExpectedErrors();

    expect(result).toBe(false);
  });
});
