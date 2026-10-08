import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { HEADER_NAV_BAR_VARIANTS, HeaderNavBarVariant } from '../abTestConfig';
import { useHomeNavBarConfig } from './useHomeNavBarConfig';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks', () => ({
  useABTest: jest.fn(),
}));

const mockAssignment = (variantName: HeaderNavBarVariant) => {
  jest.mocked(useABTest).mockReturnValue({
    variant: HEADER_NAV_BAR_VARIANTS[variantName],
    variantName,
    isActive: true,
  });
};

const mockInterimFlag = (isEnabled: boolean) => {
  jest.mocked(useSelector).mockReturnValue(isEnabled);
};

describe('useHomeNavBarConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInterimFlag(false);
    mockAssignment(HeaderNavBarVariant.Control);
  });

  it('keeps the current header and tab bar for the control arm', () => {
    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: false,
      isCompactHeader: false,
      isInterimHeader: false,
      isHeaderSearchEnabled: false,
      isSocialTabAllowed: false,
      trailingNavBarAction: 'none',
    });
  });

  it('maps the trade-focused arm to the compact header and trade button', () => {
    mockAssignment(HeaderNavBarVariant.TradeFocused);

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: true,
      isCompactHeader: true,
      isInterimHeader: false,
      isHeaderSearchEnabled: true,
      isSocialTabAllowed: true,
      trailingNavBarAction: 'trade',
    });
  });

  it('uses the interim layout over any experiment arm when the flag is on', () => {
    mockInterimFlag(true);
    mockAssignment(HeaderNavBarVariant.SearchFocused);

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: true,
      isCompactHeader: false,
      isInterimHeader: true,
      isHeaderSearchEnabled: false,
      isSocialTabAllowed: false,
      trailingNavBarAction: 'trade',
    });
  });

  it('tracks experiment exposure only when asked and the interim flag is off', () => {
    renderHook(() => useHomeNavBarConfig({ trackExposure: true }));

    expect(jest.mocked(useABTest)).toHaveBeenLastCalledWith(
      'homeTMCU1276AbtestHeaderNavBar',
      HEADER_NAV_BAR_VARIANTS,
      expect.objectContaining({ trackExposure: true }),
    );
  });

  it('suppresses experiment exposure when the interim flag is on', () => {
    mockInterimFlag(true);

    renderHook(() => useHomeNavBarConfig({ trackExposure: true }));

    expect(jest.mocked(useABTest)).toHaveBeenLastCalledWith(
      'homeTMCU1276AbtestHeaderNavBar',
      HEADER_NAV_BAR_VARIANTS,
      expect.objectContaining({ trackExposure: false }),
    );
  });

  it('is assignment-only by default', () => {
    renderHook(() => useHomeNavBarConfig());

    expect(jest.mocked(useABTest)).toHaveBeenLastCalledWith(
      'homeTMCU1276AbtestHeaderNavBar',
      HEADER_NAV_BAR_VARIANTS,
      expect.objectContaining({ trackExposure: false }),
    );
  });
});
