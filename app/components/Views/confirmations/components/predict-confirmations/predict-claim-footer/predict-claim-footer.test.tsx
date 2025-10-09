import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PredictClaimFooter } from './predict-claim-footer';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';

function render() {
  return renderWithProvider(<PredictClaimFooter />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('PredictClaimFooter', () => {
  it('renders market count', () => {
    const { getByText } = render();

    expect(
      getByText(strings('confirm.predict_claim.footer_top', { count: 5 })),
    ).toBeDefined();
  });

  it('renders market images', () => {
    const { getAllByTestId } = render();
    expect(getAllByTestId('token-avatar-image')).toHaveLength(3);
  });
});
