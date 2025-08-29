import React from 'react';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { PerpsDeposit } from './deposit';
import { simpleSendTransactionControllerMock } from '../../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../../__mocks__/controllers/other-controllers-mock';
import { useTokensWithBalance } from '../../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { emptySignatureControllerMock } from '../../../../__mocks__/controllers/signature-controller-mock';
import { useGasFeeEstimates } from '../../../../hooks/gas/useGasFeeEstimates';
import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useTransactionPayToken } from '../../../../hooks/pay/useTransactionPayToken';
import { usePerpsDepositView } from '../../hooks/usePerpsDepositView';
import { useTokenAsset } from '../../../../hooks/useTokenAsset';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';

jest.mock('../../../../hooks/ui/useNavbar');
jest.mock('../../../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('../../../../hooks/gas/useGasFeeEstimates');
jest.mock('../../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../../hooks/pay/useTransactionPayToken');
jest.mock('../../hooks/usePerpsDepositView');
jest.mock('../../../../hooks/useTokenAsset');
jest.mock('../../../../hooks/useTokenAmount');
jest.mock('../../../../hooks/ui/useClearConfirmationOnBackSwipe');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  emptySignatureControllerMock,
  otherControllersMock,
);

describe('PerpsDeposit', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const useGasFeeEstimatesMock = jest.mocked(useGasFeeEstimates);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const usePerpsDepositViewMock = jest.mocked(usePerpsDepositView);
  const useTokenAssetMock = jest.mocked(useTokenAsset);
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokensWithBalanceMock.mockReturnValue([]);

    useGasFeeEstimatesMock.mockReturnValue({
      gasFeeEstimates: {},
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: '0x123',
        chainId: '0x1',
        balance: '0',
        balanceFiat: '0',
        decimals: 18,
        symbol: 'TST',
      },
      setPayToken: noop,
    });

    usePerpsDepositViewMock.mockReturnValue({
      isFullView: false,
    });

    useTokenAssetMock.mockReturnValue({
      asset: {
        address: '0xabc',
      },
    } as ReturnType<typeof useTokenAsset>);

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '1',
      updateTokenAmount: noop,
    } as unknown as ReturnType<typeof useTokenAmount>);
  });

  it('renders pay token', () => {
    const { getByText } = renderWithProvider(
      <PerpsDeposit />,
      {
        state: STATE_MOCK,
      },
      true,
    );

    expect(getByText('Pay with')).toBeDefined();
  });

  it('hides total', async () => {
    const { queryByTestId } = renderWithProvider(
      <PerpsDeposit />,
      {
        state: STATE_MOCK,
      },
      true,
    );

    expect(queryByTestId('total-row')).toBeNull();
  });

  it('hides gas fee', async () => {
    const { queryByTestId } = renderWithProvider(
      <PerpsDeposit />,
      {
        state: STATE_MOCK,
      },
      true,
    );

    expect(
      queryByTestId(ConfirmationRowComponentIDs.GAS_FEES_DETAILS),
    ).toBeNull();
  });
});
