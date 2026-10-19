import React from 'react';
import { render } from '@testing-library/react-native';
import { AssetPollingProvider } from './AssetPollingProvider';
import { useArcDefaultTokens } from '../useArcDefaultTokens';

jest.mock('../useArcDefaultTokens', () => ({
  useArcDefaultTokens: jest.fn(),
}));

const CHAIN_IDS_MOCK = ['0x1', '0x2'] as const;

describe('AssetPollingProvider', () => {
  const mockUseArcDefaultTokens = jest.mocked(useArcDefaultTokens);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useArcDefaultTokens on render', () => {
    render(<AssetPollingProvider />);

    expect(mockUseArcDefaultTokens).toHaveBeenCalledTimes(1);
  });

  it('calls useArcDefaultTokens regardless of props provided', () => {
    render(
      <AssetPollingProvider
        chainIds={[...CHAIN_IDS_MOCK]}
        address="0x1234567890abcdef"
      />,
    );

    expect(mockUseArcDefaultTokens).toHaveBeenCalledTimes(1);
  });
});
