import { ChainId } from '@metamask/controller-utils';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePayAsset } from './usePayAsset';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationMetricsReducer from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
) as unknown as RootState;

const TRANSACTION_ID_MOCK =
  STATE_MOCK.engine.backgroundState.TransactionController.transactions[0].id;

const PAY_ASSET_MOCK: ConfirmationMetricsReducer.PayAsset = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: '0x123',
};

function runHook({
  payAsset,
}: { payAsset?: ConfirmationMetricsReducer.PayAsset } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (payAsset) {
    mockState.confirmationMetrics = {
      metricsById: {},
      payAssetById: {
        [TRANSACTION_ID_MOCK]: payAsset,
      },
    };
  }

  return renderHookWithProvider(usePayAsset, {
    state: mockState,
  });
}

describe('usePayAsset', () => {
  it('returns default pay asset if no state', () => {
    const { result } = runHook();

    expect(result.current.payAsset).toEqual({
      address: EMPTY_ADDRESS,
      chainId: ChainId.mainnet,
    });
  });

  it('returns pay asset from state', () => {
    const { result } = runHook({
      payAsset: PAY_ASSET_MOCK,
    });

    expect(result.current.payAsset).toEqual(PAY_ASSET_MOCK);
  });

  it('sets pay asset in state', () => {
    const setPayAssetActionMock = jest.spyOn(
      ConfirmationMetricsReducer,
      'setPayAsset',
    );

    const { result } = runHook();

    result.current.setPayAsset(PAY_ASSET_MOCK);

    expect(setPayAssetActionMock).toHaveBeenCalledWith({
      id: TRANSACTION_ID_MOCK,
      payAsset: PAY_ASSET_MOCK,
    });
  });
});
