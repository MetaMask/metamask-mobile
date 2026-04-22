import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoCollapsed from './account-network-info-collapsed';
import useAccountInfo from '../../../../hooks/useAccountInfo';

jest.mock('../../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../../util/address'),
  getLabelTextByAddress: jest.fn(),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

jest.mock('../../../../hooks/useAccountInfo');

describe('AccountNetworkInfoCollapsed', () => {
  const mockUseAccountInfo = jest.mocked(useAccountInfo);

  beforeEach(() => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: undefined,
      accountGroupName: undefined,
    } as unknown as ReturnType<typeof useAccountInfo>);
  });

  it('renders correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('0x935E7...05477')).toBeOnTheScreen();
  });

  it('displays accountGroupName when available instead of accountName', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: undefined,
      accountGroupName: 'My Account Group',
    } as unknown as ReturnType<typeof useAccountInfo>);

    const { getByText, queryByText } = renderWithProvider(
      <AccountNetworkInfoCollapsed />,
      {
        state: personalSignatureConfirmationState,
      },
    );

    expect(getByText('My Account Group')).toBeOnTheScreen();
    expect(queryByText('0x935E7...05477')).toBeNull();
  });

  it('displays accountName when accountGroupName is not available', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: undefined,
      accountGroupName: undefined,
    } as unknown as ReturnType<typeof useAccountInfo>);

    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: personalSignatureConfirmationState,
    });

    expect(getByText('0x935E7...05477')).toBeOnTheScreen();
  });

  it('displays walletName when there are multiple wallets', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: 'My Wallet',
      accountGroupName: 'My Account Group',
    } as unknown as ReturnType<typeof useAccountInfo>);

    // State with multiple wallets
    const stateWithMultipleWallets = {
      ...personalSignatureConfirmationState,
      engine: {
        ...personalSignatureConfirmationState.engine,
        backgroundState: {
          ...personalSignatureConfirmationState.engine.backgroundState,
          AccountTreeController: {
            accountTree: {
              wallets: {
                'wallet-1': { id: 'wallet-1' },
                'wallet-2': { id: 'wallet-2' },
              },
            },
          },
        },
      },
    };

    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: stateWithMultipleWallets,
    });

    expect(getByText('My Account Group')).toBeOnTheScreen();
    expect(getByText('My Wallet')).toBeOnTheScreen();
  });
});
