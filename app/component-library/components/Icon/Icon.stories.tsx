import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import Icon, { IconSize, IconName } from './';

storiesOf('Component Library / Icon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('Size', IconSize, IconSize.Md);

    return <Icon name={IconName.Medal} size={sizeSelector} />;
  });
