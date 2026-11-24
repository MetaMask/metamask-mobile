import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import { MfaSettingsSelectorsIDs } from './Mfa.testIds';
import SocialLinkEmailBottomSheet from './SocialLinkEmailBottomSheet';

describe('SocialLinkEmailBottomSheet', () => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, email input, and confirm button', () => {
    render(
      <SocialLinkEmailBottomSheet onSubmit={onSubmit} onClose={onClose} />,
    );

    expect(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('mfa.settings.social_link_email_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_INPUT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_CONFIRM),
    ).toBeOnTheScreen();
  });

  it('disables the confirm button when email is empty', () => {
    render(
      <SocialLinkEmailBottomSheet onSubmit={onSubmit} onClose={onClose} />,
    );

    const confirmButton = screen.getByTestId(
      MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_CONFIRM,
    );

    expect(confirmButton).toBeDisabled();
  });

  it('disables the confirm button when email contains only whitespace', () => {
    render(
      <SocialLinkEmailBottomSheet onSubmit={onSubmit} onClose={onClose} />,
    );

    fireEvent.changeText(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_INPUT),
      '   ',
    );

    expect(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_CONFIRM),
    ).toBeDisabled();
  });

  it('submits the trimmed email when confirm is pressed', () => {
    render(
      <SocialLinkEmailBottomSheet onSubmit={onSubmit} onClose={onClose} />,
    );

    fireEvent.changeText(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_INPUT),
      '  alice@example.com  ',
    );
    fireEvent.press(
      screen.getByTestId(MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_CONFIRM),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('alice@example.com');
  });

  it('calls onClose when the sheet closes via Android back request', () => {
    render(
      <SocialLinkEmailBottomSheet onSubmit={onSubmit} onClose={onClose} />,
    );
    const { onRequestClose } = screen.UNSAFE_getByType(Modal).props;

    onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
