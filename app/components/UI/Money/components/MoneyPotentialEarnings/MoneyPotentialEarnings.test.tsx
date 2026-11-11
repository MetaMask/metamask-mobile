import React from 'react';
import { EthAccountType } from '@metamask/keyring-api';
import BigNumber from 'bignumber.js';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { MoneyDepositAsset } from '../../selectors/depositTokens';
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import MoneyPotentialEarnings from './MoneyPotentialEarnings';
import { PotentialEarningsTokenRowTestIds } from './PotentialEarningsTokenRow.testIds';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../hooks/useProjectedEarnings', () => ({
  useProjectedEarnings: jest.fn(),
}));

jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => 'AssetLogo',
);
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));

jest.mock('../../utils/moneyFormatFiat', () => ({
  moneyFormatFiat: jest.fn(
    (value: BigNumber, currency: string) => `${currency}:${value.toFixed(2)}`,
  ),
  moneySafeTokenFiatCurrency: jest.fn(
    (token: MoneyDepositAsset | undefined | null) =>
      token?.fiat?.currency ?? 'usd',
  ),
}));

const mockUseProjectedEarnings = jest.mocked(useProjectedEarnings);
const mockMoneyFormatFiat = jest.mocked(moneyFormatFiat);

const createToken = (
  symbol: string,
  fiatBalance: number,
  index: number,
): MoneyDepositAsset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: `0x${index.toString(16).padStart(40, '0')}`,
    name: `${symbol} Coin`,
    symbol,
    address: `0x${index.toString(16).padStart(40, '0')}`,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    balance: String(fiatBalance),
    rawBalance: fiatBalance > 0 ? '0x1' : '0x0',
    isNative: false,
    balanceInSelectedCurrency: `$${fiatBalance.toFixed(2)}`,
    fiat: {
      balance: fiatBalance,
      currency: 'USD',
      conversionRate: 1,
    },
  }) as MoneyDepositAsset;

const USDC = createToken('USDC', 100, 1);

const projectedEarningsResult = (
  overrides: Partial<ReturnType<typeof useProjectedEarnings>> = {},
): ReturnType<typeof useProjectedEarnings> => ({
  eligibleTokens: [USDC],
  totalAssetsFiat: 100,
  projectedAmount: 4,
  currency: 'usd',
  ...overrides,
});

const renderComponent = (
  props: Partial<React.ComponentProps<typeof MoneyPotentialEarnings>> = {},
) =>
  render(
    <MoneyPotentialEarnings
      tokens={[USDC]}
      apyDecimal={0.04}
      onProjectedAmountPress={jest.fn()}
      {...props}
    />,
  );

describe('MoneyPotentialEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectedEarnings.mockReturnValue(projectedEarningsResult());
  });

  it('returns no content when no token has a positive balance', () => {
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: [],
        totalAssetsFiat: 0,
        projectedAmount: 0,
      }),
    );

    renderComponent({ tokens: [createToken('ZERO', 0, 2)] });

    expect(
      screen.queryByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the positive aggregate projection', () => {
    renderComponent();

    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.TOTAL),
    ).toHaveTextContent('usd:100.00');
    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.PROJECTED),
    ).toHaveTextContent('+usd:4.00');
    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.TEXT),
    ).toHaveTextContent(
      new RegExp(
        strings('money.potential_earnings.description_with_amounts_prefix'),
      ),
    );
  });

  it('propagates a non-USD currency to aggregate formatting', () => {
    const eurToken = createToken('EURC', 100, 2);
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: [eurToken],
        currency: 'eur',
      }),
    );

    renderComponent({ tokens: [eurToken] });

    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.TOTAL),
    ).toHaveTextContent('eur:100.00');
    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.PROJECTED),
    ).toHaveTextContent('+eur:4.00');
    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'eur',
    );
  });

  it('dispatches projected amount presses from the actual pressable', () => {
    const onProjectedAmountPress = jest.fn();
    renderComponent({ onProjectedAmountPress });

    fireEvent.press(
      screen.getByTestId(MoneyPotentialEarningsTestIds.PROJECTED_BUTTON),
    );

    expect(onProjectedAmountPress).toHaveBeenCalledTimes(1);
  });

  it('masks aggregate amounts in privacy mode', () => {
    renderComponent({ privacyMode: true });

    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.TOTAL),
    ).toHaveTextContent('•'.repeat(9));
    expect(
      screen.getByTestId(MoneyPotentialEarningsTestIds.PROJECTED),
    ).toHaveTextContent('•'.repeat(6));
  });

  it('renders fallback copy when projected earnings are zero', () => {
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({ projectedAmount: 0 }),
    );

    renderComponent({ apyDecimal: 0 });

    expect(
      screen.getByText(strings('money.potential_earnings.description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneyPotentialEarningsTestIds.PROJECTED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders no section-header interaction for five eligible tokens', () => {
    const tokens = Array.from({ length: 5 }, (_, index) =>
      createToken(`T${index}`, index + 1, index + 10),
    );
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: tokens,
        totalAssetsFiat: 15,
        projectedAmount: 0.6,
      }),
    );

    renderComponent({ tokens, onHeaderPress: jest.fn() });

    expect(
      screen.queryByTestId(MoneyPotentialEarningsTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('dispatches section-header presses when more than five tokens exist', () => {
    const tokens = Array.from({ length: 6 }, (_, index) =>
      createToken(`T${index}`, index + 1, index + 10),
    );
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: tokens,
        totalAssetsFiat: 21,
        projectedAmount: 0.84,
      }),
    );
    const onHeaderPress = jest.fn();
    renderComponent({ tokens, onHeaderPress });

    fireEvent.press(screen.getByTestId(MoneyPotentialEarningsTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).toBeOnTheScreen();
  });

  it('omits section-header interaction without a handler', () => {
    const tokens = Array.from({ length: 6 }, (_, index) =>
      createToken(`T${index}`, index + 1, index + 10),
    );
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: tokens,
        totalAssetsFiat: 21,
        projectedAmount: 0.84,
      }),
    );

    renderComponent({ tokens });

    expect(
      screen.queryByTestId(MoneyPotentialEarningsTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('renders only the first five eligible token rows', () => {
    const tokens = Array.from({ length: 6 }, (_, index) =>
      createToken(`T${index}`, index + 1, index + 10),
    );
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: tokens,
        totalAssetsFiat: 21,
        projectedAmount: 0.84,
      }),
    );

    renderComponent({ tokens });

    expect(
      screen.getByTestId(PotentialEarningsTokenRowTestIds.ROW('T4')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PotentialEarningsTokenRowTestIds.ROW('T5')),
    ).not.toBeOnTheScreen();
  });

  it('passes token-row state through the production child contract', () => {
    renderComponent({
      privacyMode: true,
      isNoFeeToken: (token) => token.symbol === 'USDC',
    });

    expect(
      screen.getByTestId(PotentialEarningsTokenRowTestIds.ROW('USDC')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('money.potential_earnings.no_fee')),
    ).toBeOnTheScreen();
  });

  it('dispatches token-card presses with token position and eligible count', () => {
    const secondToken = createToken('USDT', 50, 2);
    const onTokenCardPress = jest.fn();
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: [USDC, secondToken],
        totalAssetsFiat: 150,
        projectedAmount: 6,
      }),
    );

    renderComponent({
      tokens: [USDC, secondToken],
      onTokenCardPress,
    });

    fireEvent.press(
      screen.getByTestId(PotentialEarningsTokenRowTestIds.ROW('USDT')),
    );

    expect(onTokenCardPress).toHaveBeenCalledWith(secondToken, 1, 2);
  });

  it('dispatches token-button presses with token position and eligible count', () => {
    const secondToken = createToken('USDT', 50, 2);
    const onTokenButtonPress = jest.fn();
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({
        eligibleTokens: [USDC, secondToken],
        totalAssetsFiat: 150,
        projectedAmount: 6,
      }),
    );

    renderComponent({
      tokens: [USDC, secondToken],
      onTokenButtonPress,
    });

    fireEvent.press(
      screen.getByTestId(PotentialEarningsTokenRowTestIds.BUTTON('USDT')),
    );

    expect(onTokenButtonPress).toHaveBeenCalledWith(secondToken, 1, 2);
  });

  it('uses zero APY when the APY prop is undefined', () => {
    mockUseProjectedEarnings.mockReturnValue(
      projectedEarningsResult({ projectedAmount: 0 }),
    );

    renderComponent({ apyDecimal: undefined });

    expect(mockUseProjectedEarnings).toHaveBeenCalledWith([USDC], 0);
  });
});
