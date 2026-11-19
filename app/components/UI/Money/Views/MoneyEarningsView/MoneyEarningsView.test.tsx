import React from 'react';
import { StyleSheet } from 'react-native';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEarningsView from './MoneyEarningsView';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const mockGoBack = jest.fn();
const mockUseRoute = jest.fn();
const mockTabsBarProps = jest.fn();
const mockEarningsTab = jest.fn();
const mockMoneyEarningsFooter = jest.fn(() => null);
interface MockTabsBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual(
    '@react-navigation/native',
  ) as typeof import('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: (): { goBack: typeof mockGoBack } => ({
      goBack: mockGoBack,
    }),
    useRoute: (): ReturnType<typeof mockUseRoute> => mockUseRoute(),
  };
});

jest.mock('./EarningsTab', () => ({
  __esModule: true,
  default: (props: { isActive: boolean }) => {
    mockEarningsTab(props);
    return null;
  },
}));

jest.mock(
  '../../../../../component-library/components-temp/Tabs/TabsBar',
  () => ({
    __esModule: true,
    default: (props: MockTabsBarProps) => mockTabsBarProps(props) || null,
  }),
);

jest.mock('./MoneyEarningsFooter', () => ({
  __esModule: true,
  default: () => mockMoneyEarningsFooter() || null,
}));

let mockIsMoneyBrandRefresh = false;
jest.mock(
  '../../../../../selectors/featureFlagController/moneyBrandRefresh',
  () => ({
    selectMoneyBrandRefreshEnabled: () => mockIsMoneyBrandRefresh,
  }),
);

const mockHeaderStandardGlassProps = jest.fn();

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      mockHeaderStandardGlassProps(props) || null,
  }),
);

const getTabsBarProps = (): {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
} =>
  mockTabsBarProps.mock.calls.at(-1)?.[0] as ReturnType<typeof getTabsBarProps>;

describe('MoneyEarningsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMoneyBrandRefresh = false;
    mockUseRoute.mockReturnValue({ params: undefined });
  });

  describe('header', () => {
    it('renders the plain header when brand refresh is disabled', () => {
      const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

      expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isGlass: false,
          isFloating: false,
          includesTopInset: true,
        }),
      );
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyEarningsViewTestIds.CONTAINER).props.style,
        ),
      ).not.toHaveProperty('paddingTop');
    });

    it('renders the glass header when brand refresh is enabled', () => {
      mockIsMoneyBrandRefresh = true;

      renderWithProvider(<MoneyEarningsView />);

      expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isGlass: true,
          isFloating: false,
          includesTopInset: true,
        }),
      );
    });
  });

  it('initializes the Earnings tab when route params are missing', () => {
    renderWithProvider(<MoneyEarningsView />);

    const earningsTab = getTabsBarProps().tabs.find(
      ({ key }) => key === 'earnings',
    );

    expect(earningsTab?.isDisabled).toBeUndefined();
    expect(getTabsBarProps().activeIndex).toBe(0);
    expect(mockEarningsTab).toHaveBeenCalledWith({ isActive: true });
    expect(mockMoneyEarningsFooter).toHaveBeenCalledTimes(1);
  });

  it('normalizes a disabled Allocation route tab to Earnings', () => {
    mockUseRoute.mockReturnValue({ params: { activeTab: 'allocation' } });

    renderWithProvider(<MoneyEarningsView />);

    const { tabs, activeIndex } = getTabsBarProps();

    expect(tabs.find(({ key }) => key === 'apy')?.isDisabled).toBe(true);
    expect(tabs.find(({ key }) => key === 'allocation')?.isDisabled).toBe(true);
    expect(activeIndex).toBe(0);
    expect(mockEarningsTab).toHaveBeenCalledWith({ isActive: true });
  });

  it('normalizes a malformed route tab to Earnings', () => {
    mockUseRoute.mockReturnValue({ params: { activeTab: 'unsupported' } });

    renderWithProvider(<MoneyEarningsView />);

    expect(getTabsBarProps().activeIndex).toBe(0);
    expect(mockEarningsTab).toHaveBeenCalledWith({ isActive: true });
  });

  it('keeps APY and Allocation disabled', () => {
    renderWithProvider(<MoneyEarningsView />);

    getTabsBarProps().onTabPress(1);
    getTabsBarProps().onTabPress(2);

    expect(getTabsBarProps().activeIndex).toBe(0);
    expect(mockEarningsTab).toHaveBeenCalledWith({ isActive: true });
  });

  it('lazily mounts and retains the visited Earnings panel', () => {
    const { getByTestId, rerender } = renderWithProvider(<MoneyEarningsView />);

    const panel = getByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);

    expect(panel).toBeOnTheScreen();
    expect(StyleSheet.flatten(panel.props.style)).toMatchObject({
      display: 'flex',
      flexBasis: '0%',
      flexGrow: 1,
      flexShrink: 1,
    });
    expect(panel.props.accessibilityElementsHidden).toBe(false);
    expect(panel.props.importantForAccessibility).toBe('auto');
    expect(panel.props.pointerEvents).toBe('auto');
    expect(mockEarningsTab).toHaveBeenCalledTimes(1);

    rerender(<MoneyEarningsView />);

    expect(getByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL)).toBe(panel);
    expect(mockEarningsTab).toHaveBeenLastCalledWith({ isActive: true });
  });

  it('does not rerender an already visited Earnings tab', () => {
    renderWithProvider(<MoneyEarningsView />);
    const initialRenderCount = mockEarningsTab.mock.calls.length;

    getTabsBarProps().onTabPress(0);

    expect(mockEarningsTab).toHaveBeenCalledTimes(initialRenderCount);
  });

  it('passes the active state to the rendered Earnings tab', () => {
    renderWithProvider(<MoneyEarningsView />);

    expect(mockEarningsTab).toHaveBeenLastCalledWith({ isActive: true });
  });
});
