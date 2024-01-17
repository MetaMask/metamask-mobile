/* eslint-disable react/display-name */
import React from 'react';

// Internal dependencies.
import { default as ModalConfirmationComponent } from './ModalConfirmation';
import { SAMPLE_MODALCONFIRMATION_PROPS } from './ModalConfirmation.constants';

const ModalConfirmationMeta = {
  title: 'Component Library / Modals',
  component: ModalConfirmationComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.title,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.description,
    },
    cancelLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.cancelLabel,
    },
    confirmLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.confirmLabel,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.isDanger,
    },
  },
};
export default ModalConfirmationMeta;

export const ModalConfirmation = {
  render: (args: {
    title: string;
    description: string;
    onConfirm?: (() => void) | undefined;
    onCancel?: (() => void) | undefined;
    cancelLabel?: string | undefined;
    confirmLabel?: string | undefined;
    isDanger?: boolean | undefined;
  }) => (
    <ModalConfirmationComponent
      route={{
        params: { ...args },
      }}
    />
  ),
};
