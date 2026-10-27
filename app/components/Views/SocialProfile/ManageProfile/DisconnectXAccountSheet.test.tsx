import React from 'react';
import { act, fireEvent, within } from '@testing-library/react-native';

import DisconnectXAccountSheet from './DisconnectXAccountSheet';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { XAuthError, XAuthErrorType } from '../../../../core/XAuthService';

const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();

const renderSheet = (
  props: Partial<React.ComponentProps<typeof DisconnectXAccountSheet>> = {},
) =>
  renderWithProvider(
    <DisconnectXAccountSheet
      handle="tester"
      isDisconnecting={false}
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
      {...props}
    />,
  );

describe('DisconnectXAccountSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  it('renders the title and a body naming the handle', () => {
    const { getByTestId } = renderSheet();

    const sheet = getByTestId(
      ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET,
    );

    expect(
      within(sheet).getByText(
        strings('manage_profile.x_account_disconnect_sheet_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(sheet).getByText(
        strings('manage_profile.x_account_disconnect_sheet_body', {
          handle: '@tester',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the no-handle body when there is no handle', () => {
    const { getByText } = renderSheet({ handle: undefined });

    expect(
      getByText(
        strings('manage_profile.x_account_disconnect_sheet_body_no_handle'),
      ),
    ).toBeOnTheScreen();
  });

  it('calls onConfirm once when Disconnect is pressed', async () => {
    const { getByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM),
      );
    });

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when Cancel is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL),
    );

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('shows the error line when onConfirm returns an error', async () => {
    mockOnConfirm.mockResolvedValue(
      new XAuthError(XAuthErrorType.BackendError, 'backend down'),
    );
    const { getByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM),
      );
    });

    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
    ).toHaveTextContent(strings('manage_profile.x_account_disconnect_error'));
  });

  it('does not show the error line when onConfirm succeeds', async () => {
    const { getByTestId, queryByTestId } = renderSheet();

    await act(async () => {
      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM),
      );
    });

    expect(
      queryByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
    ).toBeNull();
  });

  it('disables both buttons and ignores presses while disconnecting', () => {
    const { getByTestId } = renderSheet({ isDisconnecting: true });

    const confirm = getByTestId(
      ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
    );
    const cancel = getByTestId(
      ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
    );

    expect(confirm).toBeDisabled();
    expect(cancel).toBeDisabled();

    fireEvent.press(confirm);
    fireEvent.press(cancel);

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
