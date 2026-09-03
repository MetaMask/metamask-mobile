/* eslint-disable no-console */
/* eslint-disable import-x/prefer-default-export */

import {
  ModalConfirmationRoute,
  ModalConfirmationProps,
} from './ModalConfirmation.types';

export const MODAL_CONFIRMATION_NORMAL_BUTTON_ID =
  'modal-confirmation-normal-button';

export const MODAL_CONFIRMATION_DANGER_BUTTON_ID =
  'modal-confirmation-danger-button';

// Sample consts
const SAMPLE_MODALCONFIRMATION_ROUTE_PROPS: ModalConfirmationRoute = {
  params: {
    title: 'Sample modal confirmation title',
    description: 'Sample ModalConfirmation description',
    onConfirm: () => {
      console.log('Modal Confirmation clicked');
    },
    onCancel: () => {
      console.log('Modal Confirmation cancelled');
    },
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    isDanger: false,
  },
};

export const SAMPLE_MODALCONFIRMATION_PROPS: ModalConfirmationProps = {
  route: SAMPLE_MODALCONFIRMATION_ROUTE_PROPS,
};
