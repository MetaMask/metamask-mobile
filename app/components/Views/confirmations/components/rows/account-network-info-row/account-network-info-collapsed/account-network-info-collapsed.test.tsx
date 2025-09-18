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
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
  });

  it('displays walletName when available instead of networkName', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: 'My Custom Wallet',
      accountGroupName: undefined,
    } as unknown as ReturnType<typeof useAccountInfo>);

    const { getByText, queryByText } = renderWithProvider(
      <AccountNetworkInfoCollapsed />,
      {
        state: personalSignatureConfirmationState,
      },
    );

    expect(getByText('My Custom Wallet')).toBeOnTheScreen();
    expect(queryByText('Ethereum Mainnet')).toBeNull();
  });

  it('displays networkName when walletName is not available', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: undefined,
      accountGroupName: undefined,
    } as unknown as ReturnType<typeof useAccountInfo>);

    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: personalSignatureConfirmationState,
    });

    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
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

  it('displays both walletName and accountGroupName when both are available', () => {
    mockUseAccountInfo.mockReturnValue({
      accountName: '0x935E7...05477',
      walletName: 'My Custom Wallet',
      accountGroupName: 'My Account Group',
    } as unknown as ReturnType<typeof useAccountInfo>);

    const { getByText, queryByText } = renderWithProvider(
      <AccountNetworkInfoCollapsed />,
      {
        state: personalSignatureConfirmationState,
      },
    );

    expect(getByText('My Account Group')).toBeOnTheScreen();
    expect(getByText('My Custom Wallet')).toBeOnTheScreen();
    expect(queryByText('0x935E7...05477')).toBeNull();
    expect(queryByText('Ethereum Mainnet')).toBeNull();
  });
});
