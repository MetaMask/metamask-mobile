import { RouteProp } from '@react-navigation/native';
import React from 'react';
import { stakingClaimConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { getNavbar } from '../../Navbar/Navbar';
import StakingClaim from './StakingClaim';

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

const noop = () => undefined;
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn().mockReturnValue(noop),
    }),
  };
});

describe('StakingClaim', () => {
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

    const mockRoute: RouteProp<{ params: { amountWei: string } }, 'params'> = {
      key: 'test',
      name: 'params',
      params: { amountWei: '1000000000000000000' }
    };

    const { getByText } = renderWithProvider(<StakingClaim route={mockRoute} />, {
      state: stakingClaimConfirmationState,
    });
    expect(getByText('Estimated changes')).toBeDefined();
    expect(getByText('Claiming to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Pooled Staking')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();

    expect(mockGetNavbar).toHaveBeenCalled();
    expect(mockGetNavbar).toHaveBeenCalledWith({
      title: 'Claim',
      onReject: mockOnReject,
      addBackButton: false,
      theme: expect.any(Object),
    });
  });
});
