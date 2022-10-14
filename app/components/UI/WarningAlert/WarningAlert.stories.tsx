// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text } from '@storybook/addon-knobs';

// Internal dependencies.
import WarningAlert from './WarningAlert';

storiesOf('Components / UI / WarningAlert', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const labelSelector = text(
      'text',
      'Text of a warning alert example',
      groupId,
    );

    return <WarningAlert text={labelSelector} dismissAlert={() => false} />;
  });
