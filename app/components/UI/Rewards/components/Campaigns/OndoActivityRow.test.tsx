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
      'rewards.ondo_campaign_activity.type_external_outflow': 'Outflow',
    };
    return translations[key] ?? key;
  },
}));

jest.mock('../../utils/formatUtils', () => {
  const actual = jest.requireActual('../../utils/formatUtils');
  return {
    ...actual,
    formatSignedUsd: (value: string | null) => {
      if (value === null) return '—';
      const num = parseFloat(value);
      if (Number.isNaN(num)) return value;
      const sign = num > 0 ? '+' : '';
      const abs = Math.abs(num);
      const formatted = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return num < 0 ? `-${formatted}` : `${sign}${formatted}`;
    },
  };
});

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

  it('renders external outflow entry with shortened destAddress', () => {
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

    expect(getByText('Outflow')).toBeDefined();
    expect(getByText('USDC → 0x1234...5678')).toBeDefined();
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

  it('renders time only when timeOnly prop is true', () => {
    const entry = createEntry({ timestamp: '2026-03-28T14:30:00.000Z' });
    const { queryByText } = render(<OndoActivityRow entry={entry} timeOnly />);

    const timeText = queryByText(/\d{1,2}:\d{2}\s?(AM|PM)/);
    expect(timeText).toBeDefined();
    const fullDateText = queryByText(/Mar 28/);
    expect(fullDateText).toBeNull();
  });

  it('passes testID to the container', () => {
    const { getByTestId } = render(
      <OndoActivityRow entry={createEntry()} testID="test-row" />,
    );

    expect(getByTestId('test-row')).toBeDefined();
  });
});
