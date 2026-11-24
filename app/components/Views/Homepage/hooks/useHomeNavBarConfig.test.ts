import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { selectInterimHeaderNavBarEnabled } from '../../../../selectors/featureFlagController/interimHeaderNavBar';
import { selectHasSocialV1Access } from '../../../../selectors/featureFlagController/socialV1';
import { HEADER_NAV_BAR_VARIANTS, HeaderNavBarVariant } from '../abTestConfig';
import { useHomeNavBarConfig } from './useHomeNavBarConfig';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks', () => ({
  useABTest: jest.fn(),
}));

let mockHeaderVariant = HeaderNavBarVariant.Control;
let mockHasSocialV1Access = false;
let mockInterimEnabled = false;

describe('useHomeNavBarConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaderVariant = HeaderNavBarVariant.Control;
    mockHasSocialV1Access = false;
    mockInterimEnabled = false;
    jest
      .mocked(useSelector)
      .mockImplementation((selector: (state: never) => unknown) => {
        if (selector === selectInterimHeaderNavBarEnabled) {
          return mockInterimEnabled;
        }
        if (selector === selectHasSocialV1Access) {
          return mockHasSocialV1Access;
        }
        throw new Error('Unexpected selector');
      });
    jest.mocked(useABTest).mockImplementation(() => ({
      variant: HEADER_NAV_BAR_VARIANTS[mockHeaderVariant],
      variantName: mockHeaderVariant,
      isActive: true,
    }));
  });

  it('keeps the current header and tab bar for the control arm', () => {
    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: false,
      isCompactHeader: false,
      isInterimHeader: false,
      isSocialHeader: false,
      isHeaderSearchEnabled: false,
      isSocialTabAllowed: false,
      trailingNavBarAction: 'none',
    });
  });

  it('maps the trade-focused arm to the compact header and trade button', () => {
    mockHeaderVariant = HeaderNavBarVariant.TradeFocused;

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: true,
      isCompactHeader: true,
      isInterimHeader: false,
      isSocialHeader: false,
      isHeaderSearchEnabled: true,
      isSocialTabAllowed: true,
      trailingNavBarAction: 'trade',
    });
  });

  it('uses the interim layout over any experiment arm when the flag is on', () => {
    mockInterimEnabled = true;
    mockHeaderVariant = HeaderNavBarVariant.SearchFocused;

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: true,
      isCompactHeader: false,
      isInterimHeader: true,
      isSocialHeader: false,
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
    mockInterimEnabled = true;

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

  it('uses the Social layout when the user has Social V1 access', () => {
    mockHasSocialV1Access = true;

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current).toStrictEqual({
      isRefreshedNavBar: true,
      isCompactHeader: false,
      isInterimHeader: true,
      isSocialHeader: true,
      isHeaderSearchEnabled: false,
      isSocialTabAllowed: true,
      trailingNavBarAction: 'trade',
    });
  });

  it('keeps the Social layout on the interim header path', () => {
    mockHasSocialV1Access = true;
    mockInterimEnabled = true;

    const { result } = renderHook(() => useHomeNavBarConfig());

    expect(result.current.isSocialHeader).toBe(true);
    expect(result.current.isInterimHeader).toBe(true);
  });

  it('suppresses header experiment exposure for the Social layout', () => {
    mockHasSocialV1Access = true;

    renderHook(() => useHomeNavBarConfig({ trackExposure: true }));

    expect(jest.mocked(useABTest)).toHaveBeenLastCalledWith(
      'homeTMCU1276AbtestHeaderNavBar',
      HEADER_NAV_BAR_VARIANTS,
      expect.objectContaining({ trackExposure: false }),
    );
  });
});
