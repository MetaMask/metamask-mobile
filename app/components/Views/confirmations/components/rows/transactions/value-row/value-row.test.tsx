import React from 'react';
import { cloneDeep } from 'lodash';
import { generateContractInteractionState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ValueRow from './value-row';

describe('ValueRow', () => {
  it('does not render when transaction metadata is missing', () => {
    const stateWithoutTransaction = cloneDeep(generateContractInteractionState);
    stateWithoutTransaction.engine.backgroundState.TransactionController.transactions =
      [];

    const { toJSON } = renderWithProvider(
      <ValueRow />,
      { state: stateWithoutTransaction },
      false,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders correctly with value', () => {
    const state = cloneDeep(generateContractInteractionState);
    state.engine.backgroundState.TransactionController.transactions[0].txParams.value =
      '0x2386f26fc10000'; // 0.01 ETH

    const { getByText } = renderWithProvider(<ValueRow />, { state }, false);

    // Expect the label "Amount" (from confirm.label.amount) to be present
    expect(getByText('Amount')).toBeTruthy();
  });

  it('returns null if value is missing', () => {
    const state = cloneDeep(generateContractInteractionState);
    delete state.engine.backgroundState.TransactionController.transactions[0]
      .txParams.value;

    const { toJSON } = renderWithProvider(<ValueRow />, { state }, false);
    expect(toJSON()).toBeNull();
  });
});
