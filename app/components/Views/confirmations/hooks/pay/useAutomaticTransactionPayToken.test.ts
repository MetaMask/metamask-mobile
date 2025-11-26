import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';

jest.mock('./useTransactionPayToken');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayAvailableTokens');

const TOKEN_ADDRESS_1_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TOKEN_ADDRESS_3_MOCK = '0xabc1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_1_MOCK = '0x1';
const CHAIN_ID_2_MOCK = '0x2';

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

function runHook({ disable = false } = {}) {
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
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
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
  });

  it('selects first token', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([
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
    ] as AssetType[]);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('selects target token if no tokens with balance', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([] as AssetType[]);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('does nothing if no required tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([]);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects target token if hardware wallet', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([
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
    ] as AssetType[]);

    isHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selected nothing if disabled', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
      },
    ] as AssetType[]);

    runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });
});
