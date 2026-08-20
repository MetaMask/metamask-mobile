import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectMoneyEnableMoneyAccountFlag } from '../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import useMoneyAccountVisibility from './useMoneyAccountVisibility';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../selectors/featureFlags');
jest.mock('../selectors/eligibility');

const mockUseSelector = jest.mocked(useSelector);

interface VisibilityOptions {
  isMoneyAccountEnabled?: boolean;
  isMoneyAccountGeoEligible?: boolean;
}

const setupSelectors = ({
  isMoneyAccountEnabled = true,
  isMoneyAccountGeoEligible = true,
}: VisibilityOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyEnableMoneyAccountFlag) {
      return isMoneyAccountEnabled;
    }
    if (selector === selectIsMoneyAccountGeoEligible) {
      return isMoneyAccountGeoEligible;
    }
    return undefined;
  });
};

describe('useMoneyAccountVisibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns visible when Money account is enabled for a geo-eligible user', () => {
    setupSelectors({
      isMoneyAccountEnabled: true,
      isMoneyAccountGeoEligible: true,
    });

    const { result } = renderHook(() => useMoneyAccountVisibility());

    expect(result.current.isMoneyAccountVisible).toBe(true);
  });

  it('returns hidden when Money account feature flag is disabled', () => {
    setupSelectors({
      isMoneyAccountEnabled: false,
      isMoneyAccountGeoEligible: true,
    });

    const { result } = renderHook(() => useMoneyAccountVisibility());

    expect(result.current.isMoneyAccountVisible).toBe(false);
  });

  it('returns hidden when user is geo-ineligible', () => {
    setupSelectors({
      isMoneyAccountEnabled: true,
      isMoneyAccountGeoEligible: false,
    });

    const { result } = renderHook(() => useMoneyAccountVisibility());

    expect(result.current.isMoneyAccountVisible).toBe(false);
  });
});
