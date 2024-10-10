import React from 'react';
import { storiesOf } from '@storybook/react-native';

import CopyButton from './CopyButton';

storiesOf('Confirmations / CopyButton', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => <CopyButton copyText="DUMMY" />);
