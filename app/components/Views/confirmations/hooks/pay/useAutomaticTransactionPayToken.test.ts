import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
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
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getBestToken } from '../../utils/getBestToken';

jest.mock('../../utils/getBestToken', () => ({
  ...jest.requireActual('../../utils/getBestToken'),
  getBestToken: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayToken');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useWithdrawTokenFilter');
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
const CHAIN_ID_1_MOCK = '0x1';

const BEST_TOKEN_MOCK = {
  address: '0xBe57000000000000000000000000000000000000' as Hex,
  chainId: '0x42' as Hex,
};

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

function runHook({ disable = false }: { disable?: boolean } = {}) {
  return renderHookWithProvider(
    () => useAutomaticTransactionPayToken({ disable }),
    {
      state: STATE_MOCK,
    },
  );
}

describe('useAutomaticTransactionPayToken', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
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
  const getBestTokenMock = jest.mocked(getBestToken);

  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    getBestTokenMock.mockReturnValue(BEST_TOKEN_MOCK);

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

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
      ] as AssetType[],
      hasTokens: true,
    });
  });

  it('calls getBestToken and passes result to setPayToken', () => {
    runHook();

    expect(getBestTokenMock).toHaveBeenCalledTimes(1);
    expect(setPayTokenMock).toHaveBeenCalledWith(BEST_TOKEN_MOCK);
  });

  it('does nothing if disabled', () => {
    runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does not re-select when payToken is already set and from unchanged', () => {
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

  it('does not select when transactionId is missing', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('re-selects pay token when from address changes', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress1' },
    } as never);

    const { rerender } = runHook();

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
    expect(setPayTokenMock).toHaveBeenCalledWith(BEST_TOKEN_MOCK);
    setPayTokenMock.mockClear();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      type: TransactionType.perpsDeposit,
      txParams: { from: '0xAddress2' },
    } as never);

    rerender(undefined);

    expect(setPayTokenMock).toHaveBeenCalledWith(BEST_TOKEN_MOCK);
  });

  it('does not re-select on from change when disabled', () => {
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
});
