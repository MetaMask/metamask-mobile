jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

const mockTw = Object.assign(
  jest.fn((className: string) => ({ className })),
  {
    style: jest.fn((...args: unknown[]) => {
      const styles = args.filter(
        (arg) => typeof arg === 'string' || typeof arg === 'boolean',
      );
      return { className: styles.join(' ') };
    }),
  },
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network-icon' })),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
import AssetSelectionRow, {
  getFundingStatusText,
  type AssetSelectionRowItem,
} from './AssetSelectionRow';
import { FundingStatus } from '../../types';
import { strings } from '../../../../../../locales/i18n';

const createRowItem = (
  overrides: Partial<AssetSelectionRowItem> = {},
): AssetSelectionRowItem => ({
  address: '0x123',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  caipChainId: 'eip155:59144' as CaipChainId,
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '100',
  walletAddress: '0xwallet0000000000000000000000000000000001',
  balance: '10.000000',
  balanceFiat: '$10.00',
  ...overrides,
});

describe('AssetSelectionRow', () => {
  it('renders token symbol, funding status, and fiat balance', () => {
    const item = createRowItem();

    const { getByTestId, getByText } = render(
      <AssetSelectionRow item={item} isPriority={false} onPress={jest.fn()} />,
    );

    expect(
      getByTestId(`asset-select-item-USDC-${item.caipChainId}`),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('card.asset_selection.enabled')),
    ).toBeOnTheScreen();
    expect(getByText('$10.00')).toBeOnTheScreen();
  });

  it('applies priority highlight class when isPriority is true', () => {
    const item = createRowItem();

    const { toJSON } = render(
      <AssetSelectionRow item={item} isPriority onPress={jest.fn()} />,
    );

    expect(JSON.stringify(toJSON())).toContain(
      'border-l-4 border-primary-default bg-background-muted',
    );
  });

  it('calls onPress with the token when the row is pressed', () => {
    const item = createRowItem();
    const onPress = jest.fn();

    const { getByTestId } = render(
      <AssetSelectionRow item={item} isPriority={false} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(`asset-select-item-USDC-${item.caipChainId}`));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('renders Money Account label for Money Account entries', () => {
    const item = createRowItem({
      isMoneyAccountEntry: true,
      displaySymbol: 'mUSD',
      symbol: 'veda',
    });

    const { getByText, getByTestId } = render(
      <AssetSelectionRow item={item} isPriority={false} onPress={jest.fn()} />,
    );

    expect(
      getByText(strings('card.card_spending_limit.money_account_label')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`asset-select-item-mUSD-${item.caipChainId}`),
    ).toBeOnTheScreen();
  });
});

describe('getFundingStatusText', () => {
  it('returns enabled copy for Enabled status', () => {
    expect(getFundingStatusText(FundingStatus.Enabled)).toBe(
      strings('card.asset_selection.enabled'),
    );
  });

  it('returns limited copy for Limited status', () => {
    expect(getFundingStatusText(FundingStatus.Limited)).toBe(
      strings('card.asset_selection.limited'),
    );
  });

  it('returns not enabled copy for NotEnabled status', () => {
    expect(getFundingStatusText(FundingStatus.NotEnabled)).toBe(
      strings('card.asset_selection.not_enabled'),
    );
  });
});
