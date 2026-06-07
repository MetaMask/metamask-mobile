import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useAutomaticTransactionPayToken,
  SetPayTokenRequest,
} from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import {
  MetaMaskPayTokensFlags,
  selectMetaMaskPayTokensFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionPayRequiredToken,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import {
  useTransactionPayFiatPayment,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { selectLastWithdrawTokenByType } from '../../../../../selectors/transactionController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useMoneyAccountDepositPaymentMethods } from '../../../../UI/Ramp/hooks/useMoneyAccountDepositPaymentMethods';
import Engine from '../../../../../core/Engine';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('./useTransactionPayToken');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useWithdrawTokenFilter');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('./useIsFiatPaymentAvailable');
jest.mock('./useMMPayFiatConfig');
jest.mock('../../../../UI/Ramp/hooks/useMoneyAccountDepositPaymentMethods');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
  },
}));
jest.mock('../../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../../selectors/transactionController'),
  selectLastWithdrawTokenByType: jest.fn(),
}));
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectMetaMaskPayTokensFlags: jest.fn(),
  }),
);

const TOKEN_ADDRESS_1_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TOKEN_ADDRESS_3_MOCK = '0xabc1234567890abcdef1234567890abcdef12345678';
const PREFERRED_TOKEN_ADDRESS_MOCK =
  '0x9999999999999999999999999999999999999999';
const CHAIN_ID_1_MOCK = '0x1';
const CHAIN_ID_2_MOCK = '0x2';
const PREFERRED_CHAIN_ID_MOCK = '0x3';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.perpsDeposit,
            },
          ],
        },
      },
    },
  },
);

function runHook({
  disable = false,
  preferredToken,
}: {
  disable?: boolean;
  preferredToken?: SetPayTokenRequest;
} = {}) {
  return renderHookWithProvider(
    () => useAutomaticTransactionPayToken({ disable, preferredToken }),
    {
      state: STATE_MOCK,
    },
  );
}

describe('useAutomaticTransactionPayToken', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const useWithdrawTokenFilterMock = jest.mocked(useWithdrawTokenFilter);
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const selectMetaMaskPayTokensFlagsMock = jest.mocked(
    selectMetaMaskPayTokensFlags,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionAccountOverrideMock = jest.mocked(
    useTransactionAccountOverride,
  );
  const useMoneyAccountDepositPaymentMethodsMock = jest.mocked(
    useMoneyAccountDepositPaymentMethods,
  );
  const updateFiatPaymentMock = jest.mocked(
    Engine.context.TransactionPayController.updateFiatPayment,
  );

  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK as Hex,
        chainId: CHAIN_ID_1_MOCK as Hex,
      } as TransactionPayRequiredToken,
    ]);

    isHardwareAccountMock.mockReturnValue(false);
    useWithdrawTokenFilterMock.mockReturnValue((tokens) => tokens);

    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      minimumRequiredTokenBalance: 0,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    useTransactionAccountOverrideMock.mockReturnValue(undefined);

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    jest.mocked(useRampsPaymentMethods).mockReturnValue({
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      isLoading: false,
      isFetching: false,
      status: 'success',
      isSuccess: true,
      error: null,
    });

    jest.mocked(useIsFiatPaymentAvailable).mockReturnValue(false);
    jest.mocked(useMMPayFiatConfig).mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
      paymentMethods: [],
      isReady: false,
      isLoading: false,
    });
  });

  it('selects first token', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('does not select token when no tokens with balance and fiat unavailable', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [] as AssetType[],
      hasTokens: false,
    });

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does nothing if no required tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
    useTransactionPayRequiredTokensMock.mockReturnValue([]);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects target token if hardware wallet', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    isHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selects first available token for hardware wallet on mUSD conversion', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.musdConversion,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    isHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('selects target token for QR hardware wallet on mUSD conversion', () => {
    const isQRHardwareAccountMock = jest.mocked(isQRHardwareAccount);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.musdConversion,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selected nothing if disabled', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects preferred payment token when provided with available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: PREFERRED_TOKEN_ADDRESS_MOCK,
          chainId: PREFERRED_CHAIN_ID_MOCK,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: PREFERRED_TOKEN_ADDRESS_MOCK,
      chainId: PREFERRED_CHAIN_ID_MOCK,
    });
  });

  it('ignores preferred payment token when using hardware wallet', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    isHardwareAccountMock.mockReturnValue(true);

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('does not select token when preferred payment token provided but no tokens available and fiat unavailable', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [] as AssetType[],
      hasTokens: false,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects first available token when preferred token not in available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selects preferred token from feature flags sorted by highest success rate', () => {
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          perpsDeposit: [
            {
              address: TOKEN_ADDRESS_2_MOCK,
              chainId: CHAIN_ID_2_MOCK,
              successRate: 0.7,
            },
            {
              address: TOKEN_ADDRESS_1_MOCK,
              chainId: CHAIN_ID_1_MOCK,
              successRate: 0.95,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 5,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          fiat: { balance: 10 },
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          fiat: { balance: 20 },
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('skips preferred token from flags if balance is below minimum', () => {
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          perpsDeposit: [
            {
              address: TOKEN_ADDRESS_1_MOCK,
              chainId: CHAIN_ID_1_MOCK,
              successRate: 0.95,
            },
            {
              address: TOKEN_ADDRESS_2_MOCK,
              chainId: CHAIN_ID_2_MOCK,
              successRate: 0.7,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 15,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          fiat: { balance: 10 },
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          fiat: { balance: 20 },
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('falls back to first available token when no preferred tokens meet minimum balance', () => {
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          perpsDeposit: [
            {
              address: TOKEN_ADDRESS_1_MOCK,
              chainId: CHAIN_ID_1_MOCK,
              successRate: 0.95,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 100,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          fiat: { balance: 5 },
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          fiat: { balance: 50 },
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('uses override tokens for predict deposit transactions', () => {
    const predictStateMock = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  type: TransactionType.predictDeposit,
                },
              ],
            },
          },
        },
      },
    );

    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          predictDeposit: [
            {
              address: TOKEN_ADDRESS_2_MOCK,
              chainId: CHAIN_ID_2_MOCK,
              successRate: 0.9,
            },
          ],
          perpsDeposit: [
            {
              address: TOKEN_ADDRESS_3_MOCK,
              chainId: CHAIN_ID_2_MOCK,
              successRate: 0.8,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 0,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          fiat: { balance: 10 },
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          fiat: { balance: 10 },
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.predictDeposit,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    renderHookWithProvider(() => useAutomaticTransactionPayToken(), {
      state: predictStateMock,
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('prefers preferred token over last used token for money account withdraw', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          balance: '1',
          chainId: CHAIN_ID_2_MOCK,
          symbol: 'USDC',
        },
        {
          address: PREFERRED_TOKEN_ADDRESS_MOCK,
          balance: '1',
          chainId: PREFERRED_CHAIN_ID_MOCK,
          symbol: 'mUSD',
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x123' },
    } as never);

    jest.mocked(selectLastWithdrawTokenByType).mockReturnValue({
      address: TOKEN_ADDRESS_2_MOCK as Hex,
      chainId: CHAIN_ID_2_MOCK as Hex,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: PREFERRED_TOKEN_ADDRESS_MOCK,
      chainId: PREFERRED_CHAIN_ID_MOCK,
    });
  });

  it('falls back to last used token for money account withdraw when preferred token is unavailable', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          balance: '1',
          chainId: CHAIN_ID_2_MOCK,
          symbol: 'USDC',
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x123' },
    } as never);

    jest.mocked(selectLastWithdrawTokenByType).mockReturnValue({
      address: TOKEN_ADDRESS_2_MOCK as Hex,
      chainId: CHAIN_ID_2_MOCK as Hex,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('selects last used token for predict withdraw from nested transaction history', () => {
    const predictWithdrawStateMock = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: transactionIdMock,
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  status: 'unapproved',
                  time: 200,
                  txParams: { from: '0x123' },
                  type: TransactionType.batch,
                },
                {
                  id: 'previous-predict-withdraw',
                  metamaskPay: {
                    chainId: CHAIN_ID_2_MOCK,
                    tokenAddress: TOKEN_ADDRESS_2_MOCK,
                  },
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  status: 'confirmed',
                  time: 100,
                  txParams: { from: '0x123' },
                  type: TransactionType.batch,
                },
              ],
            },
          },
        },
      },
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          balance: '1',
          chainId: CHAIN_ID_2_MOCK,
          symbol: 'BNB',
        },
        {
          address: PREFERRED_TOKEN_ADDRESS_MOCK,
          balance: '1',
          chainId: PREFERRED_CHAIN_ID_MOCK,
          symbol: 'MUSD',
        },
      ] as AssetType[],
      hasTokens: true,
    });
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          predictWithdraw: [
            {
              address: PREFERRED_TOKEN_ADDRESS_MOCK,
              chainId: PREFERRED_CHAIN_ID_MOCK,
              successRate: 1,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 0,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.predictWithdraw }],
      txParams: { from: '0x123' },
    } as never);

    jest.mocked(selectLastWithdrawTokenByType).mockReturnValue({
      address: TOKEN_ADDRESS_2_MOCK as Hex,
      chainId: CHAIN_ID_2_MOCK as Hex,
    });

    renderHookWithProvider(() => useAutomaticTransactionPayToken(), {
      state: predictWithdrawStateMock,
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('treats missing fiat balance as 0 for minimum balance check', () => {
    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: {
          perpsDeposit: [
            {
              address: TOKEN_ADDRESS_1_MOCK,
              chainId: CHAIN_ID_1_MOCK,
              successRate: 0.95,
            },
            {
              address: TOKEN_ADDRESS_2_MOCK,
              chainId: CHAIN_ID_2_MOCK,
              successRate: 0.7,
            },
          ],
        },
      },
      minimumRequiredTokenBalance: 5,
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [],
        },
        overrides: {},
      },
    } as MetaMaskPayTokensFlags);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          fiat: { balance: 10 },
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('does not re-select when payToken is already set and from unchanged', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
      } as unknown as ReturnType<typeof useTransactionPayToken>['payToken'],
      setPayToken: setPayTokenMock,
    });

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('re-selects pay token when from address changes', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress1' },
    } as never);

    const { rerender } = runHook();

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
    setPayTokenMock.mockClear();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress2' },
    } as never);

    rerender(undefined);

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('does not re-select pay token when accountOverride changes for post-quote withdraws', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: PREFERRED_TOKEN_ADDRESS_MOCK,
          chainId: PREFERRED_CHAIN_ID_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0xAddress1' },
    } as never);

    const { rerender } = runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
    setPayTokenMock.mockClear();

    useTransactionAccountOverrideMock.mockReturnValue('0xOverrideA' as Hex);

    rerender(undefined);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does not re-select pay token on from change for post-quote withdraws', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
      } as unknown as ReturnType<typeof useTransactionPayToken>['payToken'],
      setPayToken: setPayTokenMock,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.predictWithdraw,
      txParams: { from: '0xAddress1' },
    } as never);

    const { rerender } = runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.predictWithdraw,
      txParams: { from: '0xAddress2' },
    } as never);

    rerender(undefined);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does not re-select on from change when disabled', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress1' },
    } as never);

    const { rerender } = runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress2' },
    } as never);

    rerender(undefined);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('re-selects pay token when payment override changes to MoneyAccount', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    const { rerender } = runHook();

    // Initial selection fires
    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
    setPayTokenMock.mockClear();

    // Simulate switching to money account
    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    rerender(undefined);

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  it('does not re-select on money override change when disabled', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    const { rerender } = runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();

    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    rerender(undefined);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('re-selects MUSD on money override change for post-quote transactions', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
      } as unknown as ReturnType<typeof useTransactionPayToken>['payToken'],
      setPayToken: setPayTokenMock,
    });

    const { rerender } = runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
    setPayTokenMock.mockClear();

    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    rerender(undefined);

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  it('does not re-select when money override has not changed', () => {
    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    const { rerender } = runHook();

    // Initial selection + money-override detection both fire on first render
    expect(setPayTokenMock).toHaveBeenCalledTimes(2);
    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
    setPayTokenMock.mockClear();

    // Rerender with same override — money override useEffect should not fire again
    rerender(undefined);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects MUSD on MONAD when payment override is MoneyAccount', () => {
    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  it('selects MUSD on MONAD when payment override is MoneyAccount even in post-quote flow', () => {
    jest
      .mocked(selectPaymentOverrideByTransactionId)
      .mockReturnValue(PaymentOverride.MoneyAccount);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });

    runHook({
      preferredToken: {
        address: PREFERRED_TOKEN_ADDRESS_MOCK as Hex,
        chainId: PREFERRED_CHAIN_ID_MOCK as Hex,
      },
    });

    // MoneyAccount override takes priority over preferredToken —
    // getBestToken returns MUSD unconditionally when isMoneyPaymentOverride is true
    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  describe('moneyAccountDeposit fiat auto-select path', () => {
    const MONEY_ACCOUNT_DEPOSIT_STATE_MOCK = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  type: TransactionType.moneyAccountDeposit,
                },
              ],
            },
          },
        },
      },
    );

    function runMoneyAccountDepositHook() {
      return renderHookWithProvider(
        () => useAutomaticTransactionPayToken({ autoSelectFiatPayment: true }),
        { state: MONEY_ACCOUNT_DEPOSIT_STATE_MOCK },
      );
    }

    beforeEach(() => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
      } as never);

      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [] as AssetType[],
        hasTokens: false,
      });

      jest.mocked(useIsFiatPaymentAvailable).mockReturnValue(true);
      jest.mocked(useMMPayFiatConfig).mockReturnValue({
        enabledTransactionTypes: [],
        maxDelayMinutesForPaymentMethods: 10,
      });
    });

    it('writes the best eligible payment method from the asset provider (not global provider)', () => {
      const ELIGIBLE_METHOD_ID = 'pm-debit-card';

      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [
          { id: ELIGIBLE_METHOD_ID, name: 'Debit Card', delay: [0, 5] },
          { id: 'pm-bank', name: 'Bank Transfer', delay: [60, 1440] },
        ] as never,
        isReady: true,
        isLoading: false,
      });

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: transactionIdMock }),
      );

      // Verify callback sets the correct payment method
      const callback = updateFiatPaymentMock.mock.calls[0][0].callback;
      const fiatPaymentState = { selectedPaymentMethodId: undefined };
      callback(fiatPaymentState);
      expect(fiatPaymentState.selectedPaymentMethodId).toBe(ELIGIBLE_METHOD_ID);
    });

    it('skips payment methods with delay exceeding maxDelayMinutes', () => {
      const ELIGIBLE_METHOD_ID = 'pm-bank';

      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [
          { id: 'pm-slow', name: 'Slow Method', delay: [600, 1440] },
          {
            id: ELIGIBLE_METHOD_ID,
            name: 'Bank Transfer',
            delay: [0, 9],
          },
        ] as never,
        isReady: true,
        isLoading: false,
      });

      jest.mocked(useMMPayFiatConfig).mockReturnValue({
        enabledTransactionTypes: [],
        maxDelayMinutesForPaymentMethods: 10,
      });

      runMoneyAccountDepositHook();

      const callback = updateFiatPaymentMock.mock.calls[0][0].callback;
      const fiatPaymentState = { selectedPaymentMethodId: undefined };
      callback(fiatPaymentState);
      expect(fiatPaymentState.selectedPaymentMethodId).toBe(ELIGIBLE_METHOD_ID);
    });

    it('does not write payment method while asset-provider methods are still resolving (isLoading)', () => {
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [],
        isReady: false,
        isLoading: true,
      });

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('falls back to the global provider methods once the asset path settles without a result', () => {
      const GLOBAL_METHOD_ID = 'pm-global-card';

      // Asset-provider resolution settled but produced no usable provider/methods.
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [],
        isReady: false,
        isLoading: false,
      });

      // Global provider DOES have an eligible method — used as the fallback.
      jest.mocked(useRampsPaymentMethods).mockReturnValue({
        paymentMethods: [
          { id: GLOBAL_METHOD_ID, name: 'Global Card', delay: [0, 5] },
        ] as never,
        selectedPaymentMethod: null,
        setSelectedPaymentMethod: jest.fn(),
        isLoading: false,
        isFetching: false,
        status: 'success',
        isSuccess: true,
        error: null,
      });

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).toHaveBeenCalled();
      const callback = updateFiatPaymentMock.mock.calls[0][0].callback;
      const fiatPaymentState = { selectedPaymentMethodId: undefined };
      callback(fiatPaymentState);
      expect(fiatPaymentState.selectedPaymentMethodId).toBe(GLOBAL_METHOD_ID);
    });

    it('does not select any method when all methods exceed the delay limit', () => {
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [
          { id: 'pm-slow', name: 'Slow Method', delay: [600, 2880] },
          { id: 'pm-even-slower', name: 'Even Slower', delay: [1440, 4320] },
        ] as never,
        isReady: true,
        isLoading: false,
      });

      jest.mocked(useMMPayFiatConfig).mockReturnValue({
        enabledTransactionTypes: [],
        maxDelayMinutesForPaymentMethods: 10,
      });

      runMoneyAccountDepositHook();

      // No eligible method: updateFiatPayment is NOT called (we don't fall back
      // to an ineligible bank-transfer method). isUpdated is stamped to prevent
      // a retry loop and the UI surfaces the "not available in your region" state.
      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('does not write fiatPayment when asset provider is ready but returns no methods', () => {
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [] as never,
        isReady: true,
        isLoading: false,
      });

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('does not call asset-provider query or write fiatPayment when transaction is NOT moneyAccountDeposit', () => {
      // Reset to perpsDeposit (the default in runHook)
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
        txParams: { from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164' },
      } as never);

      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [
          { address: TOKEN_ADDRESS_1_MOCK, chainId: CHAIN_ID_1_MOCK },
        ] as AssetType[],
        hasTokens: true,
      });

      // autoSelectFiatPayment=false, perpsDeposit — should select token, not fiat path
      renderHookWithProvider(
        () => useAutomaticTransactionPayToken({ autoSelectFiatPayment: false }),
        { state: STATE_MOCK },
      );

      // The asset-provider hook must not have been used with ready data
      // and updateFiatPayment must not be called
      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
      // Token path should still work
      expect(setPayTokenMock).toHaveBeenCalledWith({
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
      });
    });

    it('does not write fiatPayment when already selected (one-shot guard)', () => {
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [
          { id: 'pm-card', name: 'Card', delay: [0, 5] },
        ] as never,
        isReady: true,
        isLoading: false,
      });

      // fiatPayment already has a selected method
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-existing',
        caipAssetId: undefined,
      } as never);

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('resolves payment method for non-Transak region where global selection is null', () => {
      // Global useRampsPaymentMethods returns empty (no global provider selected)
      jest.mocked(useRampsPaymentMethods).mockReturnValue({
        paymentMethods: [],
        selectedPaymentMethod: null,
        setSelectedPaymentMethod: jest.fn(),
        isLoading: false,
        isFetching: false,
        status: 'success',
        isSuccess: true,
        error: null,
      });

      // But the asset-specific provider has methods (delay within allowed limit)
      const NON_TRANSAK_METHOD_ID = 'pm-local-bank';
      useMoneyAccountDepositPaymentMethodsMock.mockReturnValue({
        paymentMethods: [
          { id: NON_TRANSAK_METHOD_ID, name: 'Local Bank', delay: [0, 5] },
        ] as never,
        isReady: true,
        isLoading: false,
      });

      runMoneyAccountDepositHook();

      expect(updateFiatPaymentMock).toHaveBeenCalled();
      const callback = updateFiatPaymentMock.mock.calls[0][0].callback;
      const fiatPaymentState = { selectedPaymentMethodId: undefined };
      callback(fiatPaymentState);
      expect(fiatPaymentState.selectedPaymentMethodId).toBe(
        NON_TRANSAK_METHOD_ID,
      );
    });
  });
});
