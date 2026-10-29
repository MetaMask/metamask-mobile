import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';
import { BottomSheet } from '@metamask/design-system-react-native';

import DisconnectXAccountSheet from './DisconnectXAccountSheet';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();

const renderSheet = (
  props: Partial<React.ComponentProps<typeof DisconnectXAccountSheet>> = {},
) =>
  renderWithProvider(
    <DisconnectXAccountSheet
      handle="tester"
      isDisconnecting={false}
      errorMessage={null}
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
      {...props}
    />,
  );

describe('DisconnectXAccountSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('calls onConfirm once when Disconnect is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when Cancel is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL),
    );

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('shows the error line when an error message is passed', () => {
    const { getByTestId } = renderSheet({
      errorMessage: strings('manage_profile.x_account_disconnect_error'),
    });

    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
    ).toHaveTextContent(strings('manage_profile.x_account_disconnect_error'));
  });

  it('hides the error line when there is no error message', () => {
    const { queryByTestId } = renderSheet();

    expect(
      queryByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR),
    ).toBeNull();
  });

  describe('screen reader announcement', () => {
    let announceSpy: jest.SpyInstance;

    beforeEach(() => {
      announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    });

    afterEach(() => {
      announceSpy.mockRestore();
    });

    it('exposes the error line as a polite alert', () => {
      const { getByTestId } = renderSheet({
        errorMessage: strings('manage_profile.x_account_disconnect_error'),
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR).props,
      ).toEqual(
        expect.objectContaining({
          accessibilityRole: 'alert',
          accessibilityLiveRegion: 'polite',
        }),
      );
    });

    it('announces the error when it appears', () => {
      const { rerender } = renderSheet();

      expect(announceSpy).not.toHaveBeenCalled();

      rerender(
        <DisconnectXAccountSheet
          handle="tester"
          isDisconnecting={false}
          errorMessage={strings('manage_profile.x_account_disconnect_error')}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      expect(announceSpy).toHaveBeenCalledWith(
        strings('manage_profile.x_account_disconnect_error'),
      );
    });

    it('does not announce when there is no error', () => {
      renderSheet();

      expect(announceSpy).not.toHaveBeenCalled();
    });
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

  it('blocks backdrop and swipe dismissal only while disconnecting', () => {
    const { UNSAFE_getByType, rerender } = renderSheet();

    expect(UNSAFE_getByType(BottomSheet).props.isInteractable).toBe(true);

    rerender(
      <DisconnectXAccountSheet
        handle="tester"
        isDisconnecting
        errorMessage={null}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(UNSAFE_getByType(BottomSheet).props.isInteractable).toBe(false);
  });
});
