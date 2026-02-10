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

  const testCases = [
    {
      description: 'renders activity header with asset name when available',
      assetOverrides: { name: 'Ethereum', symbol: 'ETH' },
      expectedTxHeader: 'Ethereum activity',
    },
    {
      description:
        'renders activity header with symbol when name is not available',
      assetOverrides: { name: '', symbol: 'ETH' },
      expectedTxHeader: 'ETH activity',
    },
    {
      description:
        'renders default Activity text when both name and symbol are empty',
      assetOverrides: { name: '', symbol: '' },
      expectedTxHeader: 'Activity',
    },
    {
      description:
        'renders default Activity text when both name and symbol are undefined',
      assetOverrides: { name: undefined, symbol: undefined },
      expectedTxHeader: 'Activity',
    },
    {
      description: 'prefers name over symbol when both are available',
      assetOverrides: { name: 'Token Name', symbol: 'TKN' },
      expectedTxHeader: 'Token Name activity',
    },
  ];

  it.each(testCases)('$description', ({ assetOverrides, expectedTxHeader }) => {
    const asset = createMockAsset(assetOverrides);

    const { getByText } = render(<ActivityHeader asset={asset} />);

    expect(getByText(expectedTxHeader)).toBeDefined();
  });
});
