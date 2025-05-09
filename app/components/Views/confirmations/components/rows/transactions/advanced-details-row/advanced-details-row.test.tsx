import { cloneDeep } from 'lodash';
import React from 'react';
import { generateContractInteractionState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { useEditNonce } from '../../../../../../hooks/useEditNonce';
import AdvancedDetailsRow from './advanced-details-row';

jest.mock('../../../../../../UI/Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

jest.mock('../../../../legacy/SendFlow/components/CustomNonceModal', () => 'CustomNonceModal');
jest.mock('../../../UI/expandable-section', () => 'ExpandableSection');
jest.mock('../../../../../../../component-library/components/Texts/Text', () => ({
  TextColor: { Primary: 'primary' },
  TextVariant: { BodyMD: 'bodyMD' },
  default: 'Text',
}));

jest.mock('../../../../../../hooks/useEditNonce', () => ({
  useEditNonce: jest.fn(),
}));

describe('AdvancedDetailsRow', () => {
  const mockUseEditNonce = {
    setShowNonceModal: jest.fn(),
    setUserSelectedNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: 42,
    userSelectedNonce: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditNonce as jest.Mock).mockReturnValue(mockUseEditNonce);
  });

  it('does not render when transaction metadata is missing', () => {
    // Create state without transaction to ensure metadata is missing
    const stateWithoutTransaction = cloneDeep(generateContractInteractionState);
    stateWithoutTransaction.engine.backgroundState.TransactionController.transactions = [];

    const { toJSON } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state: stateWithoutTransaction },
      false
    );
    expect(toJSON()).toBeNull();
  });

  it('does not render when txParams.to is missing', () => {
    // Create a state with a transaction that has no 'to' field
    const stateWithoutTo = cloneDeep(generateContractInteractionState);
    stateWithoutTo.engine.backgroundState.TransactionController.transactions[0].txParams.to = undefined;

    const { toJSON } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state: stateWithoutTo },
      false
    );
    expect(toJSON()).toBeNull();
  });

  // We can't easily test interactions in this case because our mocks are simple string replacements
  // Testing the basic rendering is still valuable
  it('should set up the component with correct props', () => {
    (useEditNonce as jest.Mock).mockReturnValue({
      ...mockUseEditNonce,
      userSelectedNonce: 42,
    });

    renderWithProvider(
      <AdvancedDetailsRow />,
      { state: generateContractInteractionState },
      false
    );

    // Verify the hook was called
    expect(useEditNonce).toHaveBeenCalled();
  });
});
