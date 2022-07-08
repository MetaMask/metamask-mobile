/* eslint-disable no-console, react-native/no-inline-styles */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import ConfirmationModal from './ConfirmationModal';
import { text, select } from '@storybook/addon-knobs';
import { ConfirmationModalVariant } from './ConfirmationModal.types';

storiesOf('Component Library / ConfirmationModal', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const variantSelector = select(
      'route.params.variant',
      ConfirmationModalVariant,
      ConfirmationModalVariant.Normal,
      groupId,
    );
    const titleSelector = text('route.params.title', 'Title!', groupId);
    const descriptionSelector = text(
      'route.params.description',
      'Here is a long description. Here is a long description. Here is a long description. Here is a long description.',
      groupId,
    );

    return (
      <ConfirmationModal
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
