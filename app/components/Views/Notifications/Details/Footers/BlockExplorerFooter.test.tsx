import React from 'react';

import { render } from '@testing-library/react-native';
import BlockExplorerFooter from './BlockExplorerFooter';
import { useSelector } from 'react-redux';
import { getBlockExplorerByChainId } from '../../../../../util/notifications';
import { ModalFooterType } from '../../../../../util/notifications/constants/config';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
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
      notification: MOCK_NOTIFICATIONS[0],
      type: ModalFooterType.BLOCK_EXPLORER,
    } as const;

    const { toJSON } = render(<BlockExplorerFooter {...props} />);

    expect(toJSON()).toBeNull();
  });
});

