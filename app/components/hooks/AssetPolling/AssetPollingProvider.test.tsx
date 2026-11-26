import React from 'react';
import { render } from '@testing-library/react-native';
import { AssetPollingProvider } from './AssetPollingProvider';

const CHAIN_IDS_MOCK = ['0x1', '0x2'] as const;

describe('AssetPollingProvider', () => {
  it('renders nothing', () => {
    const { toJSON } = render(<AssetPollingProvider />);

    expect(toJSON()).toBeNull();
  });

  it('renders nothing regardless of props provided', () => {
    const { toJSON } = render(
      <AssetPollingProvider
        chainIds={[...CHAIN_IDS_MOCK]}
        address="0x1234567890abcdef"
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
