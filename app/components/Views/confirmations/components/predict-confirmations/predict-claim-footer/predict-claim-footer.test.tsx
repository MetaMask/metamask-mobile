import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PredictClaimFooter } from './predict-claim-footer';
import { merge, noop } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  accountMock,
  otherControllersMock,
} from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

function render({
  address,
  onPress,
  onError,
  singlePosition,
}: {
  address?: string;
  onPress?: () => void;
  onError?: (error?: Error) => void;
  singlePosition?: boolean;
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  if (singlePosition) {
    state.engine.backgroundState.PredictController.claimablePositions = {
      [accountMock]: [
        otherControllersMock.engine.backgroundState.PredictController
          .claimablePositions[accountMock][0],
      ],
    };
  }

  return renderWithProvider(
    <PredictClaimFooter
      address={address ?? accountMock}
      onPress={onPress ?? noop}
      onError={onError ?? noop}
    />,
    {
      state,
    },
  );
}

describe('PredictClaimFooter', () => {
  it('renders market count', () => {
    // Given 5 won positions
    const { getByText } = render();

    // Then the market count is displayed
    expect(
      getByText(strings('confirm.predict_claim.footer_top', { count: 5 })),
    ).toBeDefined();
  });

  it('renders market images', () => {
    // Given 5 won positions with icons
    const { getAllByTestId } = render();

    // Then the avatar group shows up to 3 avatars
    expect(getAllByTestId('token-avatar-image')).toHaveLength(3);
  });

  it('calls onPress when button is pressed', () => {
    // Given a button with an onPress handler
    const onPressMock = jest.fn();
    const { getByText } = render({ onPress: onPressMock });

    // When the button is pressed
    fireEvent.press(getByText(strings('confirm.predict_claim.button_label')));

    // Then the onPress handler is called
    expect(onPressMock).toHaveBeenCalled();
  });

  it('calls onError when there are no won positions', () => {
    // Arrange - state with no claimable positions for the given address
    const onErrorMock = jest.fn();
    const state = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    );

    // Act
    const { queryByTestId } = renderWithProvider(
      <PredictClaimFooter
        address={'0xunknown'}
        onPress={noop}
        onError={onErrorMock}
      />,
      { state },
    );

    // Assert - component returns null and calls onError
    expect(queryByTestId('predict-claim-footer')).toBeNull();
    expect(onErrorMock).toHaveBeenCalledWith(
      new Error('Tried to claim but no positions were won'),
    );
  });

  it('renders extra info for single win', () => {
    const { getByText } = render({ singlePosition: true });

    expect(getByText('Market 1')).toBeDefined();
    expect(getByText('$100 on Yes')).toBeDefined();
  });
});
