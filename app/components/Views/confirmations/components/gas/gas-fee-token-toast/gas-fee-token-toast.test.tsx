import React from 'react';
import { toast } from '@metamask/design-system-react-native';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { Hex } from '@metamask/utils';

import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { GasFeeTokenToast } from './gas-fee-token-toast';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState, {
  backgroundState,
} from '../../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../../reducers';
import { GasFeeToken, TransactionType } from '@metamask/transaction-controller';
import { Token } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { AccountsControllerState } from '@metamask/accounts-controller';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

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

const mockToast = toast as unknown as jest.Mock;

function renderToastHook(
  state: RootState = initialRootState,
  { gasFeeToken }: { gasFeeToken?: GasFeeToken } = {},
) {
  (useGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
  (useSelectedGasFeeToken as jest.Mock).mockReturnValue(gasFeeToken);
  (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
    chainId: '0x1',
  });
  return renderWithProvider(<GasFeeTokenToast />, { state });
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
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does nothing if token has not changed (same as prevRef)', () => {
    renderToastHook(TOKENS_CONTROLLER_STATE, {
      gasFeeToken: GAS_FEE_TOKEN_MOCK,
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('calls toast when token changes', () => {
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);

    const { rerender } = renderToastHook(TOKENS_CONTROLLER_STATE, {
      gasFeeToken: GAS_FEE_TOKEN_USDC_MOCK,
    });
    expect(mockToast).toHaveBeenCalledTimes(1);

    rerender(<GasFeeTokenToast />);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `You're paying this network fee with ${matchingTokenSymbol}.`,
        hasNoTimeout: false,
        startAccessory: expect.anything(),
      }),
    );
  });

  it('uses default chainId when chainId is undefined', () => {
    (useGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(
      GAS_FEE_TOKEN_USDC_MOCK,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      chainId: undefined,
    });

    renderWithProvider(<GasFeeTokenToast />, {
      state: TOKENS_CONTROLLER_STATE,
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('does nothing for mUSD conversion transactions', () => {
    (useGasFeeToken as jest.Mock).mockReturnValue(GAS_FEE_TOKEN_MOCK);
    (useSelectedGasFeeToken as jest.Mock).mockReturnValue(
      GAS_FEE_TOKEN_USDC_MOCK,
    );
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      chainId: '0x1',
      type: TransactionType.musdConversion,
    });

    renderWithProvider(<GasFeeTokenToast />, {
      state: TOKENS_CONTROLLER_STATE,
    });

    expect(mockToast).not.toHaveBeenCalled();
  });
});
