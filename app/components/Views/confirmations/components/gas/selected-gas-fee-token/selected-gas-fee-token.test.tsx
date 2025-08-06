import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SelectedGasFeeToken } from './selected-gas-fee-token';
import { useInsufficientBalanceAlert } from '../../../hooks/alerts/useInsufficientBalanceAlert';
import { useSelectedGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { merge } from 'lodash';

jest.mock('../../../hooks/alerts/useInsufficientBalanceAlert');
jest.mock('../../../hooks/gas/useGasFeeToken');
jest.mock('../../../hooks/gas/useIsGaslessSupported');
jest.mock('../../../hooks/useNetworkInfo');

describe('SelectedGasFeeToken', () => {
  const mockUseInsufficientBalanceAlert = jest.mocked(
    useInsufficientBalanceAlert,
  );
  const mockUseSelectedGasFeeToken = jest.mocked(useSelectedGasFeeToken);
  const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the gas fee token button with the native token symbol', () => {
    mockUseInsufficientBalanceAlert.mockReturnValue([]);
    mockUseSelectedGasFeeToken.mockReturnValue(undefined);
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
    });
    mockUseNetworkInfo.mockReturnValue({
      networkNativeCurrency: 'ETH',
    } as ReturnType<typeof useNetworkInfo>);

    const { getByTestId, getByText } = renderWithProvider(
      <SelectedGasFeeToken />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
  });

  it('renders the arrow icon when gas fee tokens are available', () => {
    mockUseInsufficientBalanceAlert.mockReturnValue([]);
    mockUseSelectedGasFeeToken.mockReturnValue({
      tokenAddress: '0xTokenAddress',
      symbol: 'DAI',
    } as unknown as ReturnType<typeof useSelectedGasFeeToken>);
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: true,
      isSmartTransaction: true,
    });
    mockUseNetworkInfo.mockReturnValue({
      networkNativeCurrency: 'ETH',
    } as ReturnType<typeof useNetworkInfo>);

    const stateWithSelectedGasFeeToken = merge(
      {},
      transferTransactionStateMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
                  gasFeeTokens: [
                    { tokenAddress: '0xTokenAddress', symbol: 'DAI' },
                  ],
                },
              ],
            },
          },
        },
      },
    );

    const { getByTestId, getByText } = renderWithProvider(
      <SelectedGasFeeToken />,
      {
        state: stateWithSelectedGasFeeToken,
      },
    );

    expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
    expect(getByText('DAI')).toBeOnTheScreen();
    expect(getByTestId('selected-gas-fee-token-arrow')).toBeOnTheScreen();
  });

  it('does not render the arrow icon when no gas fee tokens are available', () => {
    mockUseInsufficientBalanceAlert.mockReturnValue([]);
    mockUseSelectedGasFeeToken.mockReturnValue(undefined);
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
    });
    mockUseNetworkInfo.mockReturnValue({
      networkNativeCurrency: 'ETH',
    } as ReturnType<typeof useNetworkInfo>);

    const { queryByTestId } = renderWithProvider(<SelectedGasFeeToken />, {
      state: transferTransactionStateMock,
    });

    expect(queryByTestId('selected-gas-fee-token-arrow')).toBeNull();
  });
});
