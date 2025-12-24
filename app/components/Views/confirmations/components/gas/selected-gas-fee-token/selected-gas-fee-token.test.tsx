import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SelectedGasFeeToken } from './selected-gas-fee-token';
import { useInsufficientBalanceAlert } from '../../../hooks/alerts/useInsufficientBalanceAlert';
import { useSelectedGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../hooks/gas/useIsGaslessSupported';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { merge } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { Alert } from '../../../types/alerts';
import { GasFeeToken } from '@metamask/transaction-controller';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

jest.mock('../../../hooks/alerts/useInsufficientBalanceAlert');
jest.mock('../../../hooks/gas/useGasFeeToken');
jest.mock('../../../hooks/gas/useIsGaslessSupported');
jest.mock('../../../hooks/useNetworkInfo');
jest.mock('../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../hooks/transactions/useTransactionBatchesMetadata');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

describe('SelectedGasFeeToken', () => {
  const mockUseInsufficientBalanceAlert = jest.mocked(
    useInsufficientBalanceAlert,
  );
  const mockUseSelectedGasFeeToken = jest.mocked(useSelectedGasFeeToken);
  const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);
  const mockUseTransactionBatchesMetadata = jest.mocked(
    useTransactionBatchesMetadata,
  );
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  const setupTest = ({
    insufficientBalance = [],
    selectedGasFeeToken = undefined,
    gaslessSupported = false,
    isSmartTransaction = false,
    gasFeeTokens = [],
    transactionMetadata,
  }: {
    insufficientBalance?: Alert[];
    selectedGasFeeToken?: ReturnType<typeof useSelectedGasFeeToken>;
    gaslessSupported?: boolean;
    isSmartTransaction?: boolean;
    gasFeeTokens?: GasFeeToken[];
    transactionMetadata?: ReturnType<
      typeof useTransactionMetadataRequest
    > | null;
    expectModal?: boolean;
  } = {}) => {
    mockUseInsufficientBalanceAlert.mockReturnValue(insufficientBalance);
    mockUseSelectedGasFeeToken.mockReturnValue(selectedGasFeeToken);
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: gaslessSupported,
      isSmartTransaction,
      pending: false,
    });
    mockUseNetworkInfo.mockReturnValue({
      networkNativeCurrency: 'ETH',
    } as ReturnType<typeof useNetworkInfo>);

    // Set transaction metadata mock
    // - If explicitly set to null, mock as undefined
    // - If explicitly provided (even undefined), use that value
    // - Otherwise, create default based on gasFeeTokens
    if (transactionMetadata === null) {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    } else if (transactionMetadata !== undefined) {
      mockUseTransactionMetadataRequest.mockReturnValue(transactionMetadata);
    } else if (gasFeeTokens.length > 0) {
      mockUseTransactionMetadataRequest.mockReturnValue({
        chainId: '0x1',
        gasFeeTokens,
      } as Partial<
        ReturnType<typeof useTransactionMetadataRequest>
      > as ReturnType<typeof useTransactionMetadataRequest>);
    } else {
      mockUseTransactionMetadataRequest.mockReturnValue({
        chainId: '0x1',
      } as Partial<
        ReturnType<typeof useTransactionMetadataRequest>
      > as ReturnType<typeof useTransactionMetadataRequest>);
    }

    const state =
      gasFeeTokens.length > 0
        ? merge({}, transferTransactionStateMock, {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [
                    {
                      id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
                      gasFeeTokens,
                    },
                  ],
                },
              },
            },
          })
        : transferTransactionStateMock;

    const renderResult = renderWithProvider(<SelectedGasFeeToken />, { state });

    return {
      ...renderResult,
      pressTokenButton: () =>
        fireEvent.press(renderResult.getByTestId('selected-gas-fee-token')),
      expectModalToOpen: () => {
        expect(renderResult.queryByTestId('gas-fee-token-modal')).toBeNull();
        fireEvent.press(renderResult.getByTestId('selected-gas-fee-token'));
        expect(
          renderResult.getByTestId('gas-fee-token-modal'),
        ).toBeOnTheScreen();
      },
      expectModalNotToOpen: () => {
        fireEvent.press(renderResult.getByTestId('selected-gas-fee-token'));
        expect(renderResult.queryByTestId('gas-fee-token-modal')).toBeNull();
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);
  });

  it('renders the gas fee token button with the native token symbol', () => {
    const { getByTestId, getByText } = setupTest();
    expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
  });

  it('renders the arrow icon when gas fee tokens are available', () => {
    const { getByTestId, getByText } = setupTest({
      selectedGasFeeToken: {
        tokenAddress: '0xTokenAddress',
        symbol: 'DAI',
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      gaslessSupported: true,
      isSmartTransaction: true,
      gasFeeTokens: [
        { tokenAddress: '0xTokenAddress', symbol: 'DAI' },
      ] as unknown as GasFeeToken[],
    });

    expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
    expect(getByText('DAI')).toBeOnTheScreen();
    expect(getByTestId('selected-gas-fee-token-arrow')).toBeOnTheScreen();
  });

  it('does not render the arrow icon when no gas fee tokens are available', () => {
    const { queryByTestId } = setupTest();
    expect(queryByTestId('selected-gas-fee-token-arrow')).toBeNull();
  });

  describe('Modal', () => {
    it('opens modal when button is pressed and gas fee tokens are supported', () => {
      const { expectModalToOpen } = setupTest({
        selectedGasFeeToken: {
          tokenAddress: '0xTokenAddress',
          symbol: 'DAI',
        } as unknown as ReturnType<typeof useSelectedGasFeeToken>,
        gaslessSupported: true,
        isSmartTransaction: true,
        gasFeeTokens: [
          { tokenAddress: '0xTokenAddress', symbol: 'DAI' },
        ] as unknown as GasFeeToken[],
      });

      expectModalToOpen();
    });

    it('does not open modal when button is pressed but gas fee tokens are not supported', () => {
      const { expectModalNotToOpen } = setupTest({
        gaslessSupported: false,
        isSmartTransaction: false,
      });

      expectModalNotToOpen();
    });

    it('closes modal when onClose is called', () => {
      const { getByTestId, queryByTestId } = setupTest({
        selectedGasFeeToken: {
          tokenAddress: '0xTokenAddress',
          symbol: 'DAI',
        } as unknown as ReturnType<typeof useSelectedGasFeeToken>,
        gaslessSupported: true,
        isSmartTransaction: true,
        gasFeeTokens: [
          { tokenAddress: '0xTokenAddress', symbol: 'DAI' },
        ] as unknown as GasFeeToken[],
      });

      // Open modal
      fireEvent.press(getByTestId('selected-gas-fee-token'));
      expect(getByTestId('gas-fee-token-modal')).toBeOnTheScreen();

      // Close modal
      fireEvent.press(getByTestId('back-button'));
      expect(queryByTestId('gas-fee-token-modal')).toBeNull();
    });

    describe('Future native token', () => {
      it('supports future native tokens when insufficient native balance and smart transaction', () => {
        const { expectModalToOpen } = setupTest({
          insufficientBalance: [{ reason: 'insufficient' } as unknown as Alert],
          gaslessSupported: true,
          isSmartTransaction: true,
          gasFeeTokens: [
            { tokenAddress: NATIVE_TOKEN_ADDRESS, symbol: 'ETH' },
          ] as unknown as GasFeeToken[],
        });

        expectModalToOpen();
      });

      it('does not support gas fee tokens when only future native token and insufficient balance but not smart transaction', () => {
        const { expectModalNotToOpen } = setupTest({
          insufficientBalance: [
            { reason: 'insufficient' },
          ] as unknown as Alert[],
          gaslessSupported: true,
          isSmartTransaction: false,
          gasFeeTokens: [
            { tokenAddress: NATIVE_TOKEN_ADDRESS, symbol: 'ETH' },
          ] as unknown as GasFeeToken[],
        });

        expectModalNotToOpen();
      });
    });

    it('does not support gas fee tokens when gasless is not supported', () => {
      const { expectModalNotToOpen } = setupTest({
        gaslessSupported: false,
        isSmartTransaction: true,
        gasFeeTokens: [
          { tokenAddress: '0xTokenAddress', symbol: 'DAI' },
        ] as unknown as GasFeeToken[],
      });

      expectModalNotToOpen();
    });

    it('supports gas fee tokens when not only future native token', () => {
      const { expectModalToOpen } = setupTest({
        gaslessSupported: true,
        isSmartTransaction: true,
        gasFeeTokens: [
          { tokenAddress: '0xTokenAddress1', symbol: 'DAI' },
          { tokenAddress: NATIVE_TOKEN_ADDRESS, symbol: 'ETH' },
        ] as unknown as GasFeeToken[],
      });

      expectModalToOpen();
    });
  });

  describe('Batch Transactions', () => {
    it('uses chainId from batch metadata when transaction metadata is unavailable', () => {
      const batchChainId = '0xe708';

      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);

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

      setupTest({ transactionMetadata: null });
      const { getByTestId } = renderWithProvider(<SelectedGasFeeToken />, {
        state: stateWithoutTransactionMeta,
      });

      expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
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

      setupTest({
        transactionMetadata: {
          chainId: transactionChainId,
        } as Partial<
          ReturnType<typeof useTransactionMetadataRequest>
        > as ReturnType<typeof useTransactionMetadataRequest>,
      });

      expect(mockUseNetworkInfo).toHaveBeenCalledWith(transactionChainId);
    });

    it('renders correctly with batch metadata chainId', () => {
      const batchChainId = '0xe708';

      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);

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

      setupTest({ transactionMetadata: null });
      const { getByTestId, getByText } = renderWithProvider(
        <SelectedGasFeeToken />,
        { state: stateWithoutTransactionMeta },
      );

      expect(getByTestId('selected-gas-fee-token')).toBeOnTheScreen();
      expect(getByText('ETH')).toBeOnTheScreen();
    });
  });
});
