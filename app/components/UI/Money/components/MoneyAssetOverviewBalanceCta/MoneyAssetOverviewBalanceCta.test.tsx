import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  MoneyAssetOverviewBalanceCta,
  MoneyAssetOverviewBalanceDescription,
} from './MoneyAssetOverviewBalanceCta';
import { MoneyAssetOverviewBalanceCtaTestIds } from './MoneyAssetOverviewBalanceCta.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockTrackTooltipClicked = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackTooltipClicked: mockTrackTooltipClicked,
  })),
}));

const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);

describe('MoneyAssetOverviewBalanceCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the projected earnings description with the amount masked in privacy mode', () => {
    const { getByTestId } = render(
      <MoneyAssetOverviewBalanceDescription
        privacyMode
        projectedEarnings="$0.21"
        tokenSymbol="USDC"
      />,
    );

    expect(
      getByTestId(MoneyAssetOverviewBalanceCtaTestIds.EARNINGS_AMOUNT),
    ).toHaveTextContent('•'.repeat(6));
  });

  it('tracks and opens the earn crypto sheet when projected earnings is pressed', () => {
    const { getByTestId } = render(
      <MoneyAssetOverviewBalanceDescription
        privacyMode={false}
        projectedEarnings="$0.21"
        tokenSymbol="USDC"
      />,
    );

    fireEvent.press(
      getByTestId(MoneyAssetOverviewBalanceCtaTestIds.EARNINGS_TOOLTIP_BUTTON),
    );

    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
      params: { showMoneyHomeCta: true },
    });
  });

  it('initializes tooltip analytics with Asset Overview source context', () => {
    render(
      <MoneyAssetOverviewBalanceDescription
        privacyMode={false}
        projectedEarnings="$0.21"
        tokenSymbol="USDC"
      />,
    );

    expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.ASSET_DETAIL,
      component_name: COMPONENT_NAMES.MONEY_ASSET_OVERVIEW_BALANCE_CTA,
    });
  });

  it('calls the deposit action when Start earning is pressed', () => {
    const onStartEarning = jest.fn();
    const { getByTestId } = render(
      <MoneyAssetOverviewBalanceCta onStartEarning={onStartEarning} />,
    );

    fireEvent.press(
      getByTestId(MoneyAssetOverviewBalanceCtaTestIds.START_EARNING_BUTTON),
    );

    expect(onStartEarning).toHaveBeenCalledTimes(1);
  });

  it('does not render a duplicate APY label below projected earnings', () => {
    const { queryByText } = render(
      <MoneyAssetOverviewBalanceDescription
        privacyMode={false}
        projectedEarnings="$0.21"
        tokenSymbol="USDC"
      />,
    );

    expect(
      queryByText(
        strings('money.asset_overview.balance_cta.earn_apy', { apy: 4 }),
      ),
    ).not.toBeOnTheScreen();
  });
});
