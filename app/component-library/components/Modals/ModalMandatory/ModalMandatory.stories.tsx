/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text } from '@storybook/addon-knobs';

// Internal dependencies.
import ModalMandatory from './ModalMandatory';

storiesOf('Component Library / ModalMandatory', module).add('Default', () => {
  const groupId = 'Props';

  const buttonTextSelector = text(
    'route.params.buttonText',
    'Accept!',
    groupId,
  );
  const checkboxTextSelector = text(
    'route.params.checkboxText',
    'This is the reason why you need to check the box',
    groupId,
  );
  const headerTitleSelector = text(
    'route.params.headerTitle',
    'Example of Title',
    groupId,
  );
  const footerHelpTextSelector = text(
    'route.params.footerHelpText',
    'You can write a reminder here',
    groupId,
  );

  return (
    <ModalMandatory
      route={{
        params: {
          buttonText: buttonTextSelector,
          checkboxText: checkboxTextSelector,
          headerTitle: headerTitleSelector,
          onAccept: () => null,
          footerHelpText: footerHelpTextSelector,
          body: {
            source: 'WebView',
            uri: 'https://consensys.net/terms-of-use/',
          },
        },
      }}
    />
  );
});
