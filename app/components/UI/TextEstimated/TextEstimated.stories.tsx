// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

// Internal dependencies.
import TextEstimated from './TextEstimated';
import { TEST_SAMPLE_TEXT } from './TextEstimated.constants';

storiesOf('Components / UI / TextEstimated', module).add('Default', () => {
  const groupId = 'Props';
  const textVariantSelector = select(
    'Variant',
    TextVariant,
    TextVariant.HeadingSMRegular,
    groupId,
  );
  const inputText = text('Text', TEST_SAMPLE_TEXT, groupId);

  return (
    <TextEstimated variant={textVariantSelector}>{inputText}</TextEstimated>
  );
});
