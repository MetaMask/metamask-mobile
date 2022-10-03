/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { ModalConfirmationVariant } from './ModalConfirmation.types';

export const MODAL_CONFIRMATION_NORMAL_BUTTON_ID =
  'modal-confirmation-normal-button';

export const MODAL_CONFIRMATION_DANGER_BUTTON_ID =
  'modal-confirmation-danger-button';

export const BUTTON_TEST_ID_BY_VARIANT = {
  [ModalConfirmationVariant.Normal]: MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
  [ModalConfirmationVariant.Danger]: MODAL_CONFIRMATION_DANGER_BUTTON_ID,
};
