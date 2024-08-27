import enContent from '../../../../locales/languages/en.json';

export const RevealSeedViewSelectorsIDs = {
  SECRET_RECOVERY_PHRASE_CONTAINER_ID: 'reveal-private-credential-screen',
  SECRET_CREDENTIAL_SCROLL_ID: 'secret-credential-scroll',
  PASSWORD_INPUT: 'login-password-input',
  PASSWORD_WARNING_ID: 'password-warning',
  COPY_PRIVATE_CREDENTIAL_TO_CLIPBOARD_BUTTON:
    'copy-private-credential-to-clipboard-button',
  SECRET_RECOVERY_PHRASE_TEXT: 'private-credential-text',
  SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID:
    'reveal-private-credential-cancel-button',
  SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID:
    'reveal-private-credential-next-button',
  SECRET_CREDENTIAL_REVEAL_BUTTON_ID: 'secret-credential-reveal-button',
  PASSWORD_INPUT_BOX_ID: 'private-credential-password-text-input',
  REVEAL_CREDENTIAL_MODAL_ID: 'reveal-credential-modal',
  SECRET_CREDENTIAL_QR_CODE_IMAGE_ID: `secret-credential-qr-code-image`,
};

export const RevealSeedViewSelectorsText = {
  REVEAL_SECRET_CREDENTIAL_TITLE_TEXT:
    enContent.reveal_credential.seed_phrase_title,
  REVEAL_SECRET_CREDENTIAL_DONE: enContent.reveal_credential.done,
  SECRET_CREDENTIAL_QR_CODE_TAB_ID: enContent.reveal_credential.qr_code,
};
