import React from 'react';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { Hex } from '@metamask/utils';

import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { GasFeeTokenToast } from './gas-fee-token-toast';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState, {
  backgroundState,
} from '../../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../../reducers';
import { GasFeeToken } from '@metamask/transaction-controller';
import { Token } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { AccountsControllerState } from '@metamask/accounts-controller';

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

jest.mock('../../../hooks/gas/useGasFeeToken', () => ({
  useSelectedGasFeeToken: jest.fn(),
  useGasFeeToken: jest.fn(),
}));
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

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
  symbol: 'ETH',
  tokenAddress: NATIVE_TOKEN_ADDRESS,
};

function renderToastHook(
  state: RootState = initialRootState,
  { gasFeeToken }: { gasFeeToken?: GasFeeToken } = {},
) {
  (useGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
  (useSelectedGasFeeToken as jest.Mock).mockReturnValue(gasFeeToken);
  (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
    chainId: '0x1',
  });
  return renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <GasFeeTokenToast />
    </ToastContext.Provider>,
    { state },
  );
}

describe('GasFeeTokenToast', () => {
  const matchingTokenAddress = '0xabc';
  const matchingTokenSymbol = 'USDC';
  const matchingTokenImage = 'http://usdc.png';
  const mockAccountId = '0xAddress1';

  const GAS_FEE_TOKEN_USDC_MOCK = {
    ...GAS_FEE_TOKEN_MOCK,
    tokenAddress: matchingTokenAddress as Hex,
    symbol: matchingTokenSymbol,
  };

  const INTERNAL_ACCOUNTS_MOCK = {
    selectedAccount: mockAccountId,
    accounts: {
      [mockAccountId]: {
        address: mockAccountId,
      },
    },
  } as unknown as Partial<AccountsControllerState>;

  const TOKENS_CONTROLLER_STATE = {
    ...initialRootState,
    engine: {
      ...initialRootState.engine,
      backgroundState: {
        ...backgroundState,
        TokensController: {
          ...backgroundState.TokensController,
          allTokens: {
            ...backgroundState.TokensController.allTokens,
            '0x1': {
              [mockAccountId]: [
                {
                  address: matchingTokenAddress,
                  symbol: matchingTokenSymbol,
                  image: matchingTokenImage,
                } as unknown as Token,
              ],
            },
          },
        },
        AccountsController: {
          internalAccounts: INTERNAL_ACCOUNTS_MOCK,
        } as unknown as Partial<AccountsControllerState>,
      },
    },
  } as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if no gasFeeToken', () => {
    renderToastHook(initialRootState, { gasFeeToken: undefined });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does nothing if no toast ref', () => {
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      chainId: '0x1',
    });

    renderWithProvider(<GasFeeTokenToast />, { state: initialRootState });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does nothing if token has not changed (same as prevRef)', () => {
    renderToastHook(TOKENS_CONTROLLER_STATE, {
      gasFeeToken: GAS_FEE_TOKEN_MOCK,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('calls showToast when token changes', () => {
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);

    const { rerender } = renderToastHook(TOKENS_CONTROLLER_STATE, {
      gasFeeToken: GAS_FEE_TOKEN_USDC_MOCK,
    });
    expect(mockShowToast).toHaveBeenCalledTimes(1);

    rerender(<GasFeeTokenToast />);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: "You're paying this network fee with ", isBold: false },
          { label: matchingTokenSymbol, isBold: true },
          { label: '.', isBold: false },
        ],
        variant: ToastVariants.Network,
        networkImageSource: { uri: matchingTokenImage },
        hasNoTimeout: false,
      }),
    );
  });

  it('calls closeToast when close button is pressed', () => {
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);

    renderToastHook(TOKENS_CONTROLLER_STATE, {
      gasFeeToken: GAS_FEE_TOKEN_USDC_MOCK,
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);

    const closeButtonOptions =
      mockShowToast.mock.calls[0][0].closeButtonOptions;
    expect(closeButtonOptions).toBeDefined();

    closeButtonOptions.onPress();

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
  });

  it('uses default chainId when chainId is undefined', () => {
    (useGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(
      GAS_FEE_TOKEN_USDC_MOCK,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      chainId: undefined,
    });

    renderWithProvider(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <GasFeeTokenToast />
      </ToastContext.Provider>,
      { state: TOKENS_CONTROLLER_STATE },
    );

    // The component should still work with undefined chainId, defaulting to '0x1'
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});
