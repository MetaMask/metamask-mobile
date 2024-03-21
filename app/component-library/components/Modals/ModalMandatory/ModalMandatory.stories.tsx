/* eslint-disable react/display-name */
import React from 'react';

// Internal dependencies.
import { default as ModalMandatoryComponent } from './ModalMandatory';
import { SAMPLE_MODALMANDATORY_PROPS } from './ModalMandatory.constants';

const ModalMandatoryMeta = {
  title: 'Component Library / Modals',
  component: ModalMandatoryComponent,
  argTypes: {
    headerTitle: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.headerTitle,
    },
    footerHelpText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.footerHelpText,
    },
    buttonText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.buttonText,
    },
    checkboxText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.checkboxText,
    },
  },
};
export default ModalMandatoryMeta;

export const ModalMandatory = {
  render: (args: {
    headerTitle: string;
    footerHelpText: string;

    buttonText: string;
    checkboxText: string;
  }) => (
    <ModalMandatoryComponent
      route={{
        params: {
          body: SAMPLE_MODALMANDATORY_PROPS.route.params.body,
          onAccept: SAMPLE_MODALMANDATORY_PROPS.route.params.onAccept,
          onRender: SAMPLE_MODALMANDATORY_PROPS.route.params.onRender,
          ...args,
        },
      }}
    />
  ),
};
