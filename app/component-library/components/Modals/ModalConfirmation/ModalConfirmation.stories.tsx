/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean, text } from '@storybook/addon-knobs';

// Internal dependencies.
import ModalConfirmation from './ModalConfirmation';

storiesOf('Component Library / ModalConfirmation', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const isDanger = boolean('isDanger', false, groupId);
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
            isDanger,
            title: titleSelector,
            description: descriptionSelector,
          },
        }}
      />
    );
  },
);
