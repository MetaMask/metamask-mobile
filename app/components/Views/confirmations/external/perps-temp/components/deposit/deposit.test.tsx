import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { PerpsDeposit } from './deposit';
import { simpleSendTransactionControllerMock } from '../../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../../__mocks__/controllers/other-controllers-mock';
import { useTokensWithBalance } from '../../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { emptySignatureControllerMock } from '../../../../__mocks__/controllers/signature-controller-mock';
import { useGasFeeEstimates } from '../../../../hooks/gas/useGasFeeEstimates';
import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { act, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../hooks/ui/useNavbar');
jest.mock('../../../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('../../../../hooks/gas/useGasFeeEstimates');

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

  beforeEach(() => {
    jest.resetAllMocks();

    useTokensWithBalanceMock.mockReturnValue([]);
    useGasFeeEstimatesMock.mockReturnValue({
      gasFeeEstimates: {},
    });
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

  it('hides total while keyboard visible', async () => {
    const { queryByTestId, getByTestId, getByText } = renderWithProvider(
      <PerpsDeposit />,
      {
        state: STATE_MOCK,
      },
      true,
    );

    expect(queryByTestId('total-row')).toBeNull();

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(getByTestId('total-row')).toBeDefined();
  });

  it('hides gas fee while keyboard visible', async () => {
    const { queryByTestId, getByTestId, getByText } = renderWithProvider(
      <PerpsDeposit />,
      {
        state: STATE_MOCK,
      },
      true,
    );

    expect(
      queryByTestId(ConfirmationRowComponentIDs.GAS_FEES_DETAILS),
    ).toBeNull();

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(
      getByTestId(ConfirmationRowComponentIDs.GAS_FEES_DETAILS),
    ).toBeDefined();
  });
});
