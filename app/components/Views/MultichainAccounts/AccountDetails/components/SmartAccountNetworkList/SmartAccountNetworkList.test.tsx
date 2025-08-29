import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SmartAccountNetworkList from './SmartAccountNetworkList';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../../util/test/confirm-data-helpers';

const mockAccountsState = {
  engine: {
    backgroundState: {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockAddress = '0x1234567890123456789012345678901234567890';

jest.mock('../../../../confirmations/hooks/7702/useEIP7702Networks', () => ({
  useEIP7702Networks: jest.fn(),
}));

jest.mock(
  '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row',
  () => jest.fn(() => null),
);

import { useEIP7702Networks } from '../../../../confirmations/hooks/7702/useEIP7702Networks';

const mockUseEIP7702Networks = useEIP7702Networks as jest.MockedFunction<
  typeof useEIP7702Networks
>;

describe('SmartAccountNetworkList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [
        {
          chainId: '0x1:mainnet',
          name: 'Ethereum Mainnet',
          isSupported: true,
          upgradeContractAddress: '0x123',
        },
      ],
      networkSupporting7702Present: true,
      pending: false,
    });
  });

  it('renders network list when data is available', async () => {
    const { getByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    await waitFor(() => {
      expect(getByTestId('network-flat-list')).toBeTruthy();
    });
  });

  it('returns null when pending', () => {
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: true,
    });

    const { queryByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    expect(queryByTestId('network-flat-list')).toBeNull();
  });

  it('returns null when no networks available', () => {
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: false,
    });

    const { queryByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    expect(queryByTestId('network-flat-list')).toBeNull();
  });
});
