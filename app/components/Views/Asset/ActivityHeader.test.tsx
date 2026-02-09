import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityHeader from './ActivityHeader';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: { symbol?: string }) => {
    if (key === 'asset_overview.activity' && params?.symbol) {
      return `${params.symbol} activity`;
    }
    if (key === 'navigation.transaction_activity') {
      return 'Activity';
    }
    return key;
  }),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      wrapper: {},
      title: {},
    },
  }),
}));

describe('ActivityHeader', () => {
  const createMockAsset = (overrides = {}) => ({
    isETH: false,
    decimals: 18,
    name: 'Test Token',
    symbol: 'TEST',
    hasBalanceError: false,
    address: '0x123',
    ...overrides,
  });

  it('renders activity header with asset name when available', () => {
    const asset = createMockAsset({ name: 'Ethereum', symbol: 'ETH' });

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText('Ethereum activity')).toBeDefined();
  });

  it('renders activity header with symbol when name is not available', () => {
    const asset = createMockAsset({ name: '', symbol: 'ETH' });

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText('ETH activity')).toBeDefined();
  });

  it('renders default Activity text when both name and symbol are missing', () => {
    const asset = createMockAsset({ name: '', symbol: '' });

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText('Activity')).toBeDefined();
  });

  it('renders default Activity text when both name and symbol are undefined', () => {
    const asset = createMockAsset({ name: undefined, symbol: undefined });

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText('Activity')).toBeDefined();
  });

  it('prefers name over symbol when both are available', () => {
    const asset = createMockAsset({ name: 'Token Name', symbol: 'TKN' });

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText('Token Name activity')).toBeDefined();
  });
});
