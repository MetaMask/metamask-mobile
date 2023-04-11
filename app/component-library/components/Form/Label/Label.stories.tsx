/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import Label from './Label';
import { LabelProps } from './Label.types';
import { SAMPLE_LABEL_TEXT } from './Label.constants';

export const getLabelStoryProps = (): LabelProps => {
  const labelText = text('label', SAMPLE_LABEL_TEXT, storybookPropsGroupID);
  return {
    children: labelText,
  };
};

const LabelStory = () => <Label {...getLabelStoryProps()} />;

storiesOf('Component Library / Form', module).add('Label', LabelStory);

export default LabelStory;
