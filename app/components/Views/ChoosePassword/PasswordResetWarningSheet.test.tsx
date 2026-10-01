import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PasswordResetWarningSheet from './PasswordResetWarningSheet';
import { PasswordResetWarningSheetSelectorsIDs } from './PasswordResetWarningSheet.testIds';
import { strings } from '../../../../locales/i18n';

describe('PasswordResetWarningSheet', () => {
  it('does not render when hidden', () => {
    const { queryByTestId } = render(
      <PasswordResetWarningSheet
        isVisible={false}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      queryByTestId(PasswordResetWarningSheetSelectorsIDs.SHEET),
    ).toBeNull();
  });

  it('renders title, description, and both CTAs when visible', () => {
    const { getByTestId } = render(
      <PasswordResetWarningSheet
        isVisible
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.TITLE),
    ).toHaveTextContent(strings('choose_password.password_warning_title'));
    expect(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(
      `${strings('choose_password.password_warning_description_part1')}${strings(
        'choose_password.password_warning_srp',
      )}${strings('choose_password.password_warning_description_part2')}`,
    );
    expect(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.CANCEL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('confirms when the primary CTA is pressed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <PasswordResetWarningSheet
        isVisible
        onConfirm={onConfirm}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(onConfirm).toHaveBeenCalled();
  });

  it('dismisses when cancel is pressed', () => {
    const onDismiss = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <PasswordResetWarningSheet
        isVisible
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.CANCEL_BUTTON),
    );

    expect(onDismiss).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dismisses when the close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <PasswordResetWarningSheet
        isVisible
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(
      getByTestId(PasswordResetWarningSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onDismiss).toHaveBeenCalled();
  });
});
