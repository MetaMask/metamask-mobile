import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { GasFeeTokenIcon } from './gas-fee-token-icon';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { merge } from 'lodash';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/transactions/useTransactionBatchesMetadata');
jest.mock('../../../hooks/useNetworkInfo');
jest.mock('../../../hooks/tokens/useTokenWithBalance', () => ({
  useTokenWithBalance: jest
    .fn()
    .mockReturnValue({ asset: { logo: 'logo.png' } }),
}));
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

describe('GasFeeTokenIcon', () => {
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);
  const mockUseTokenWithBalance = jest.mocked(useTokenWithBalance);
  const mockUseTransactionBatchesMetadata = jest.mocked(
    useTransactionBatchesMetadata,
  );
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 10,
      networkNativeCurrency: 'ETH',
      networkName: 'Ethereum',
    });
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as Partial<
      ReturnType<typeof useTransactionMetadataRequest>
    > as ReturnType<typeof useTransactionMetadataRequest>);
    jest.clearAllMocks();
  });

  it('renders the token icon when tokenAddress is not the native', () => {
    const tokenAddress = '0xTokenAddress';

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
  });

  it('renders the native token icon when tokenAddress is the native', () => {
    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });

  it('renders native icon when asset is not found', () => {
    mockUseTokenWithBalance.mockReturnValue({
      asset: undefined,
      displayName: undefined,
    } as unknown as ReturnType<typeof mockUseTokenWithBalance>);

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });

  describe('Batch Transactions', () => {
    it('uses chainId from batch metadata when transaction metadata is unavailable', () => {
      const batchChainId = '0xe708';
      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      // Create state without transaction metadata
      const stateWithoutTransactionMeta = merge(
        {},
        transferTransactionStateMock,
        {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [],
              },
            },
          },
        },
      );

      const { getByTestId } = renderWithProvider(
        <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
        { state: stateWithoutTransactionMeta },
      );

      expect(getByTestId('native-icon')).toBeOnTheScreen();
      expect(mockUseNetworkInfo).toHaveBeenCalledWith(batchChainId);
    });

    it('prefers transaction metadata chainId over batch metadata chainId', () => {
      const batchChainId = '0xe708';
      const transactionChainId = '0x1';

      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);

      // State has transaction metadata with chainId
      renderWithProvider(
        <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
        { state: transferTransactionStateMock },
      );

      // Should use transaction chainId (0x1 from transferTransactionStateMock)
      expect(mockUseNetworkInfo).toHaveBeenCalledWith(transactionChainId);
    });
  });
});
