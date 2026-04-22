import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { GasFeeTokenModal } from './gas-fee-token-modal';
import { GasFeeToken } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { updateSelectedGasFeeToken } from '../../../../../../util/transaction-controller';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { merge } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { toHex } from '@metamask/controller-utils';
import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { Hex } from '@metamask/utils';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../util/transaction-controller');
jest.mock('../../../hooks/useNetworkInfo');
jest.mock('../../../hooks/gas/useGasFeeToken');

const WETH_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567894';

const GAS_FEE_TOKEN_MOCK: GasFeeToken = {
  amount: toHex(10000),
  balance: toHex(12345),
  decimals: 18,
  gas: '0x1',
  gasTransfer: '0x2a',
  maxFeePerGas: '0x3',
  maxPriorityFeePerGas: '0x4',
  rateWei: toHex('2000000000000000000'),
  recipient: '0x1234567890123456789012345678901234567892',
  symbol: 'USDC',
  tokenAddress: '0x1234567890123456789012345678901234567893',
};
const GAS_FEE_TOKEN_2_MOCK: GasFeeToken = {
  amount: toHex(20000),
  balance: toHex(43210),
  decimals: 4,
  gas: '0x3',
  gasTransfer: '0x3a',
  maxFeePerGas: '0x4',
  maxPriorityFeePerGas: '0x5',
  rateWei: toHex('1798170000000000000'),
  recipient: '0x1234567890123456789012345678901234567893',
  symbol: 'WETH',
  tokenAddress: WETH_TOKEN_ADDRESS,
};

const MOCK_WETH_USE_GAS_FEE_TOKEN = {
  symbol: 'WETH',
  amountFiat: '$1,000.00',
  amountFormatted: '1',
  balanceFiat: '2,345.00',
  tokenAddress: WETH_TOKEN_ADDRESS as Hex,
} as ReturnType<typeof useGasFeeToken>;

const MOCK_USDC_USE_GAS_FEE_TOKEN = {
  ...GAS_FEE_TOKEN_MOCK,
  symbol: 'USDC',
  tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress as Hex,
};

const MOCK_NATIVE_USE_GAS_FEE_TOKEN = {
  ...MOCK_WETH_USE_GAS_FEE_TOKEN,
  symbol: 'ETH',
  tokenAddress: NATIVE_TOKEN_ADDRESS as Hex,
};

describe('GasFeeTokenModal', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUpdateSelectedGasFeeToken = jest.mocked(updateSelectedGasFeeToken);
  const mockUseSelectedGasFeeToken = jest.mocked(useSelectedGasFeeToken);
  const mockUseGasFeeToken = jest.mocked(useGasFeeToken);

  const mockOnClose = jest.fn();

  const setupTest = ({
    transactionId = 'test-transaction-id',
    gasFeeTokens = [],
    selectedGasFeeToken = undefined,
  }: {
    transactionId?: string;
    gasFeeTokens?: GasFeeToken[];
    selectedGasFeeToken?: string;
  } = {}) => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: transactionId,
      gasFeeTokens,
      selectedGasFeeToken,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const selectedToken = selectedGasFeeToken
      ? gasFeeTokens.find((token) => token.tokenAddress === selectedGasFeeToken)
      : undefined;

    mockUseSelectedGasFeeToken.mockReturnValue(
      selectedToken as ReturnType<typeof useSelectedGasFeeToken>,
    );

    mockUseGasFeeToken.mockImplementation(({ tokenAddress }) => {
      if (!tokenAddress || tokenAddress === NATIVE_TOKEN_ADDRESS) {
        return MOCK_NATIVE_USE_GAS_FEE_TOKEN as ReturnType<
          typeof useGasFeeToken
        >;
      }
      if (tokenAddress === GAS_FEE_TOKEN_MOCK.tokenAddress) {
        return MOCK_USDC_USE_GAS_FEE_TOKEN as ReturnType<typeof useGasFeeToken>;
      }
      if (tokenAddress === WETH_TOKEN_ADDRESS) {
        return MOCK_WETH_USE_GAS_FEE_TOKEN as ReturnType<typeof useGasFeeToken>;
      }
      return undefined as unknown as ReturnType<typeof useGasFeeToken>;
    });

    (useNetworkInfo as jest.Mock).mockReturnValue({
      networkNativeCurrency: 'ETH',
    });

    const state = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              { id: transactionId, gasFeeTokens, selectedGasFeeToken },
            ],
          },
        },
      },
    });
    return renderWithProvider(<GasFeeTokenModal onClose={mockOnClose} />, {
      state,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal, header, close button', () => {
    const { getByTestId, getByText } = setupTest();
    expect(getByTestId('gas-fee-token-modal')).toBeTruthy();
    expect(getByTestId('close-button')).toBeTruthy();
    expect(getByText('Select a token')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = setupTest();
    fireEvent.press(getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders multiple gas fee tokens', () => {
    const { getByTestId } = setupTest({
      gasFeeTokens: [GAS_FEE_TOKEN_MOCK, GAS_FEE_TOKEN_2_MOCK],
      selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
    });
    expect(
      getByTestId(
        `gas-fee-token-list-item-${MOCK_WETH_USE_GAS_FEE_TOKEN.symbol}`,
      ),
    ).toBeTruthy();
    expect(
      getByTestId(
        `gas-fee-token-list-item-${MOCK_USDC_USE_GAS_FEE_TOKEN.symbol}`,
      ),
    ).toBeTruthy();
  });

  it('handles token selection and calls updateSelectedGasFeeToken', async () => {
    const transactionId = 'test-tx-id';
    const { getByTestId } = setupTest({
      transactionId,
      gasFeeTokens: [GAS_FEE_TOKEN_MOCK, MOCK_WETH_USE_GAS_FEE_TOKEN],
      selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
    });

    fireEvent.press(
      getByTestId(
        `gas-fee-token-list-item-${MOCK_WETH_USE_GAS_FEE_TOKEN.symbol}`,
      ),
    );

    await waitFor(() =>
      expect(mockUpdateSelectedGasFeeToken).toHaveBeenCalledWith(
        transactionId,
        MOCK_WETH_USE_GAS_FEE_TOKEN.tokenAddress,
      ),
    );

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('handles native token selection', async () => {
    const transactionId = 'test-tx-id';
    const { getByTestId } = setupTest({ transactionId });

    fireEvent.press(
      getByTestId(
        `gas-fee-token-list-item-${MOCK_NATIVE_USE_GAS_FEE_TOKEN.symbol}`,
      ),
    );

    await waitFor(() =>
      expect(mockUpdateSelectedGasFeeToken).toHaveBeenCalledWith(
        transactionId,
        undefined,
      ),
    );

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('shows native token as selected when no gas fee token is selected', () => {
    const { getByTestId } = setupTest({
      gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
      selectedGasFeeToken: undefined,
    });
    expect(
      getByTestId('gas-fee-token-list-item-selected-indicator'),
    ).toBeTruthy();
  });

  it('gracefully handles missing transaction metadata', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      undefined as unknown as ReturnType<typeof useTransactionMetadataRequest>,
    );
    const { getByTestId } = renderWithProvider(
      <GasFeeTokenModal onClose={mockOnClose} />,
      { state: transferTransactionStateMock },
    );
    expect(getByTestId('gas-fee-token-modal')).toBeTruthy();
  });

  it('works if onClose prop missing', () => {
    setupTest();
    expect(() => {
      renderWithProvider(<GasFeeTokenModal />, {
        state: transferTransactionStateMock,
      });
    }).not.toThrow();
  });

  it('handles empty gas fee tokens array', () => {
    const { getByTestId } = setupTest({
      gasFeeTokens: [],
    });
    expect(getByTestId('native-icon')).toBeTruthy();
  });
});
