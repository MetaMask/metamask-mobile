import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PredictClaimFooter } from './predict-claim-footer';
import { merge, noop } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

function render({ onPress }: { onPress?: () => void } = {}) {
  return renderWithProvider(<PredictClaimFooter onPress={onPress ?? noop} />, {
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

  it('uses fallback address when selectedAddress is undefined', () => {
    // Arrange - state with no selected account address
    const stateWithNoAddress = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: undefined,
              },
            },
          },
        },
      },
    );

    // Act
    const { getByTestId } = renderWithProvider(
      <PredictClaimFooter onPress={noop} />,
      { state: stateWithNoAddress },
    );

    // Assert - component renders without crashing
    expect(getByTestId('predict-claim-footer')).toBeDefined();
  });
});
