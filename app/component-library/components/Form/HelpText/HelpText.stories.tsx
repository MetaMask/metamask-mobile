/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import HelpText from './HelpText';
import { HelpTextProps, HelpTextSeverity } from './HelpText.types';
import {
  DEFAULT_HELPTEXT_SEVERITY,
  SAMPLE_HELPTEXT_TEXT,
} from './HelpText.constants';

export const getHelpTextStoryProps = (): HelpTextProps => {
  const helpTextText = text(
    'HelpText',
    SAMPLE_HELPTEXT_TEXT,
    storybookPropsGroupID,
  );

  const severitySelector = select(
    'severity',
    HelpTextSeverity,
    DEFAULT_HELPTEXT_SEVERITY,
    storybookPropsGroupID,
  );
  return {
    children: helpTextText,
    severity: severitySelector,
  };
};

const HelpTextStory = () => <HelpText {...getHelpTextStoryProps()} />;

storiesOf('Component Library / Form', module).add('HelpText', HelpTextStory);

export default HelpTextStory;
