/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

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
    title: 'Sample ModalConfirmation Title',
    description: 'Sample ModalConfirmation description',
    onConfirm: () => {
      console.log('Modal Confirmation clicked');
    },
    onCancel: () => {
      console.log('Modal Confirmation cancelled');
    },
    cancelLabel: 'ModalConfirmation Cancel',
    confirmLabel: 'ModalConfirmation Label',
    isDanger: false,
  },
};

export const SAMPLE_MODALCONFIRMATION_PROPS: ModalConfirmationProps = {
  route: SAMPLE_MODALCONFIRMATION_ROUTE_PROPS,
};
