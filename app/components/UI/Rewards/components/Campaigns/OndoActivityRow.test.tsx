import React from 'react';
import { render } from '@testing-library/react-native';
import OndoActivityRow from './OndoActivityRow';
import type { OndoGmActivityEntryDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_activity.type_deposit': 'Deposit',
      'rewards.ondo_campaign_activity.type_withdraw': 'Withdraw',
      'rewards.ondo_campaign_activity.type_rebalance': 'Rebalance',
      'rewards.ondo_campaign_activity.type_external_outflow': 'Transfer Out',
    };
    return translations[key] ?? key;
  },
}));

const MOCK_TOKEN_SRC = {
  tokenAsset: 'eip155:59144/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  tokenSymbol: 'USDC',
  tokenName: 'USD Coin',
};

const MOCK_TOKEN_DEST = {
  tokenAsset: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
  tokenSymbol: 'AAPLon',
  tokenName: 'Apple Inc.',
};

const createEntry = (
  overrides: Partial<OndoGmActivityEntryDto> = {},
): OndoGmActivityEntryDto => ({
  type: 'DEPOSIT',
  srcToken: MOCK_TOKEN_SRC,
  destToken: MOCK_TOKEN_DEST,
  destAddress: null,
  usdAmount: '5000.000000',
  timestamp: '2026-03-28T14:30:00.000Z',
  ...overrides,
});

describe('OndoActivityRow', () => {
  it('renders deposit entry with type label and USD amount', () => {
    const { getByText } = render(
      <OndoActivityRow entry={createEntry()} testID="row-0" />,
    );

    expect(getByText('Deposit')).toBeDefined();
    expect(getByText('+$5,000.00')).toBeDefined();
  });

  it('renders withdraw entry with negative sign', () => {
    const { getByText } = render(
      <OndoActivityRow
        entry={createEntry({
          type: 'WITHDRAW',
          usdAmount: '-1250.500000',
          destToken: null,
        })}
      />,
    );

    expect(getByText('Withdraw')).toBeDefined();
    expect(getByText('-$1,250.50')).toBeDefined();
  });

  it('renders rebalance entry with dash for null amount', () => {
    const { getByText } = render(
      <OndoActivityRow
        entry={createEntry({ type: 'REBALANCE', usdAmount: null })}
      />,
    );

    expect(getByText('Rebalance')).toBeDefined();
    expect(getByText('—')).toBeDefined();
  });

  it('renders external outflow entry', () => {
    const { getByText } = render(
      <OndoActivityRow
        entry={createEntry({
          type: 'EXTERNAL_OUTFLOW',
          destToken: null,
          destAddress: '0x1234567890abcdef1234567890abcdef12345678',
          usdAmount: '-750.000000',
        })}
      />,
    );

    expect(getByText('Transfer Out')).toBeDefined();
  });

  it('renders token symbols in detail line', () => {
    const { getByText } = render(<OndoActivityRow entry={createEntry()} />);

    expect(getByText('USDC → AAPLon')).toBeDefined();
  });

  it('renders only source token when destToken is null', () => {
    const { getByText } = render(
      <OndoActivityRow entry={createEntry({ destToken: null })} />,
    );

    expect(getByText('USDC')).toBeDefined();
  });

  it('passes testID to the container', () => {
    const { getByTestId } = render(
      <OndoActivityRow entry={createEntry()} testID="test-row" />,
    );

    expect(getByTestId('test-row')).toBeDefined();
  });
});
