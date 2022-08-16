/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';

// Internal dependencies.
import ModalConfirmation from './ModalConfirmation';
import { ModalConfirmationVariant } from './ModalConfirmation.types';

storiesOf('Component Library / ModalConfirmation', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const variantSelector = select(
      'route.params.variant',
      ModalConfirmationVariant,
      ModalConfirmationVariant.Normal,
      groupId,
    );
    const titleSelector = text('route.params.title', 'Title!', groupId);
    const descriptionSelector = text(
      'route.params.description',
      'Here is a long description. Here is a long description. Here is a long description. Here is a long description.',
      groupId,
    );

    return (
      <ModalConfirmation
        route={{
          params: {
            onConfirm: () => null,
            variant: variantSelector,
            title: titleSelector,
            description: descriptionSelector,
          },
        }}
      />
    );
  },
);
