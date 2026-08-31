import React, { createRef } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { selectIsMoneyAccountVisible } from '../../../Money/selectors/visibility';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import useEarnSectionAssets from '../../hooks/useEarnSectionAssets';
import useHomeViewedEvent from '../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../Views/Homepage/hooks/useSectionPerformance';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import EarnSection, { resetEarnSectionRefreshForTests } from './EarnSection';
import HomepageEarnSection from '../../../../Views/Homepage/Sections/EarnSection/HomepageEarnSection';
import Logger from '../../../../../util/Logger';

jest.mock('@react-navigation/native');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../../../UI/Earn/hooks/useEarnSectionAssets');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/selectors/visibility');
jest.mock('../../../../UI/Money/hooks/useMoneyNavigation');
jest.mock('../../../../Views/Homepage/hooks/useHomeViewedEvent');
jest.mock('../../../../Views/Homepage/hooks/useSectionPerformance');
jest.mock('../../../../../util/Logger');
jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => () => null,
);

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnSectionAssets = jest.mocked(useEarnSectionAssets);
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyNavigation = useMoneyNavigation as jest.MockedFunction<
  typeof useMoneyNavigation
>;
const mockUseHomeViewedEvent = useHomeViewedEvent as jest.MockedFunction<
  typeof useHomeViewedEvent
>;
const mockUseSectionPerformance = useSectionPerformance as jest.MockedFunction<
  typeof useSectionPerformance
>;
const mockLoggerError = jest.mocked(Logger.error);

const navigate = jest.fn();
const mockRefetchBalance = jest.fn();

const createSectionResult = (
  overrides: Partial<ReturnType<typeof useEarnSectionAssets>> = {},
): ReturnType<typeof useEarnSectionAssets> => ({
  assetSlots: [],
  hasMoreAssets: false,
  moneyApyPercent: 6.2,
  moneyRateStatus: 'ready',
  isLoading: false,
  hasError: false,
  errors: [],
  refresh: jest.fn(),
  ...overrides,
});

const mockSectionResult = (
  overrides: Partial<ReturnType<typeof useEarnSectionAssets>> = {},
) => {
  mockUseEarnSectionAssets.mockReturnValue(createSectionResult(overrides));
};

const renderEarnSection = (
  props: Partial<React.ComponentProps<typeof EarnSection>> = {},
) =>
  render(
    <EarnSection
      tokenDetailsSource={TokenDetailsSource.ExploreEarn}
      {...props}
    />,
  );

describe('EarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEarnSectionRefreshForTests();
    mockUseSelector.mockImplementation((selector) =>
      selector === selectIsMoneyAccountVisible ? false : undefined,
    );
    mockUseNavigation.mockReturnValue({
      navigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$0.00',
      totalFiatRaw: '0',
      isBalanceLoading: false,
      refetchBalance: mockRefetchBalance,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      navigateToMoneyHome: jest.fn(),
    } as ReturnType<typeof useMoneyNavigation>);
    mockUseHomeViewedEvent.mockReturnValue({
      onLayout: jest.fn(),
    } as ReturnType<typeof useHomeViewedEvent>);
    mockUseSectionPerformance.mockReturnValue(undefined);
    mockSectionResult();
  });

  it('disables Homepage telemetry for shared Explore rendering', () => {
    renderEarnSection();

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionRef: null,
        sectionIndex: -1,
        totalSectionsLoaded: 0,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('does not refresh for the initial Explore trigger', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 0, silentRefresh: true },
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).not.toHaveBeenCalled();
  });

  it('does not refresh or query Money balance while disabled', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      enabled: false,
      refresh: { trigger: 1, silentRefresh: true },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUseEarnSectionAssets).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).not.toHaveBeenCalled();
  });

  it('refreshes catalogue and Money balance for an Explore trigger', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 1, silentRefresh: true },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('logs when an Explore refresh fails', async () => {
    const error = new Error('Explore refresh failed');
    const refresh = jest.fn().mockRejectedValue(error);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 1, silentRefresh: true },
    });

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        'EarnSection: Failed to refresh section data',
      );
    });
  });

  it('coalesces concurrent Explore refreshes across EarnSection instances', async () => {
    const firstRefresh = jest.fn().mockResolvedValue(undefined);
    const secondRefresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnSectionAssets
      .mockImplementationOnce(() =>
        createSectionResult({ refresh: firstRefresh }),
      )
      .mockImplementationOnce(() =>
        createSectionResult({ refresh: secondRefresh }),
      );

    render(
      <>
        <EarnSection
          tokenDetailsSource={TokenDetailsSource.ExploreEarn}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
        <EarnSection
          tokenDetailsSource={TokenDetailsSource.ExploreEarn}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
      </>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(firstRefresh).toHaveBeenCalledTimes(1);
    expect(secondRefresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('refreshes catalogue sources from the error action', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({
      hasError: true,
      refresh,
    });
    renderEarnSection();

    await act(async () => {
      fireEvent.press(screen.getByTestId('earn-section-error-retry-button'));
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes catalogue sources and Money balance from the section refresh handle', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });
    const ref = createRef<SectionRefreshHandle>();

    render(
      <HomepageEarnSection
        ref={ref}
        sectionIndex={0}
        totalSectionsLoaded={1}
      />,
    );

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate retries while a refresh is pending', async () => {
    let resolveRefresh: (() => void) | undefined;
    let refreshPromise: Promise<void> | undefined;
    const refresh = jest.fn(() => {
      refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      return refreshPromise;
    });
    mockSectionResult({
      hasError: true,
      refresh,
    });
    renderEarnSection();

    const retryButton = screen.getByTestId('earn-section-error-retry-button');
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);

    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
      await refreshPromise;
    });

    await act(async () => {
      fireEvent.press(retryButton);
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh?.();
      await refreshPromise;
    });
  });
});
