import { merge } from 'lodash';
import React from 'react';
import { stakingWithdrawalConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { getNavbar } from '../../Navbar/Navbar';
import StakingWithdrawal from './StakingWithdrawal';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../Navbar/Navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('StakingWithdrawal', () => {
  const mockGetNavbar = jest.mocked(getNavbar);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });
  });

  it('should render correctly', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByText } = renderWithProvider(<StakingWithdrawal route={{
      params: {
        amountWei: '1000000000000000000',
        amountFiat: '1000000000000000000'
      },
      key: 'mockRouteKey',
      name: 'params'
    }} />, {
      state: merge(stakingWithdrawalConfirmationState, {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  '0x0000000000000000000000000000000000000000': {
                    address: '0x0000000000000000000000000000000000000000',
                  },
                },
                selectedAccount: '0x0000000000000000000000000000000000000000',
              },
            },
          }
        }
      }),
    });
    expect(getByText('Withdrawal time')).toBeDefined();

    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();

    expect(getByText('Network Fee')).toBeDefined();

    expect(mockGetNavbar).toHaveBeenCalled();
    expect(mockGetNavbar).toHaveBeenCalledWith({
      title: 'Unstake',
      onReject: mockOnReject,
    });
  });
});