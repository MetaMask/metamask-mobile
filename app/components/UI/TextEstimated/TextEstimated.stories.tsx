// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

// Internal dependencies.
import TextEstimated from './TextEstimated';

storiesOf('Component Library / TextEstimated', module).add('Default', () => {
  const groupId = 'Props';
  const textVariantsSelector = select(
    'Variant',
    TextVariant,
    TextVariant.lBodyMD,
    groupId,
  );
  const inputText = text('Text', 'Sample Text', groupId);

  return (
    <TextEstimated variant={textVariantsSelector}>{inputText}</TextEstimated>
  );
});
