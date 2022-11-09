// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// Internal dependencies.
import Icon from './Icon';
import { IconSize, IconName } from './Icon.types';

storiesOf('Component Library / Icon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('size', IconSize, IconSize.Md);
    const nameSelector = select('name', IconName, IconName.LockFilled);

    return <Icon name={nameSelector} size={sizeSelector} />;
  })
  .add('Colored', () => {
    const sizeSelector = select('size', IconSize, IconSize.Xl);
    const nameSelector = select('name', IconName, IconName.LockFilled);

    return <Icon name={nameSelector} size={sizeSelector} color={'red'} />;
  });
