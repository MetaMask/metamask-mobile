import React from 'react';
import { Linking } from 'react-native';

import { render } from '@testing-library/react-native';
import BlockExplorerFooter from './BlockExplorerFooter';
import { useSelector } from 'react-redux';
import { getBlockExplorerByChainId } from '../../../../../util/notifications';
import { ModalFooterType } from '../../../../../util/notifications/constants/config';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/notifications', () => ({
  getBlockExplorerByChainId: jest.fn(),
}));

jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('BlockExplorerFooter', () => {
  it('returns null when no URL is available', () => {
    (useSelector as jest.Mock).mockReturnValue({});
    (getBlockExplorerByChainId as jest.Mock).mockReturnValue(undefined);

    const props = {
      chainId: 1,
      txHash: '0x123',
      notification: { id: '1', type: 'transaction' },
      type: ModalFooterType.BLOCK_EXPLORER,
    } as const;

    const { toJSON } = render(<BlockExplorerFooter {...props} />);

    expect(toJSON()).toBeNull();
  });
});

