import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityHeader from './ActivityHeader';

// Mock i18n strings function using actual translations from en.json.
// This is required because the react-native-i18n mock doesn't configure translations.
jest.mock('../../../../locales/i18n', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require('../../../../locales/languages/en.json');
  return {
    strings: (key: string, params?: Record<string, string>) => {
      const keys = key.split('.');
      let value: string | Record<string, unknown> = en;
      for (const k of keys) {
        value = (value as Record<string, unknown>)[k] as
          | string
          | Record<string, unknown>;
        if (value === undefined) return key;
      }
      if (typeof value === 'string' && params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] ?? '');
      }
      return value as string;
    },
  };
});

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
