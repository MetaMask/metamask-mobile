/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import BottomSheetFooter from './BottomSheetFooter';
import {
  BottomSheetFooterProps,
  ButtonsAlignment,
} from './BottomSheetFooter.types';
import {
  DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  SAMPLE_BOTTOMSHEETFOOTER_PROPS,
} from './BottomSheetFooter.constants';

export const getBottomSheetFooterStoryProps = (): BottomSheetFooterProps => ({
  buttonsAlignment: select(
    'buttonsAlignment',
    ButtonsAlignment,
    DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
    storybookPropsGroupID,
  ),
  buttonPropsArray: SAMPLE_BOTTOMSHEETFOOTER_PROPS.buttonPropsArray,
});

const BottomSheetFooterStory = () => (
  <BottomSheetFooter {...getBottomSheetFooterStoryProps()} />
);

storiesOf('Component Library / BottomSheets', module).add(
  'BottomSheetFooter',
  BottomSheetFooterStory,
);

export default BottomSheetFooterStory;
