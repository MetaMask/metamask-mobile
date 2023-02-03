/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies
import TabBarItem from './TabBarItem';

storiesOf('Component Library / TabBarItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const iconSelector = select('name', IconName, IconName.Lock, groupId);
    const labelSelector = text('label', 'Wallet', groupId);
    const selectedSelector = boolean('isSelected', true, groupId);

    return (
      <TabBarItem
        label={labelSelector}
        icon={iconSelector}
        onPress={() => console.log("I'm clicked!")}
        isSelected={selectedSelector}
      />
    );
  });
