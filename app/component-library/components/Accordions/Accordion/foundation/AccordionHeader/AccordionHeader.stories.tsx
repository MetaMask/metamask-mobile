/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { boolean, text, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';
import {
  SAMPLE_ACCORDIONHEADER_TITLE,
  DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT,
} from './AccordionHeader.constants';
import {
  AccordionHeaderHorizontalAlignment,
  AccordionHeaderProps,
} from './AccordionHeader.types';

export const getAccordionHeaderStoryProps = (): AccordionHeaderProps => {
  const titleText = text(
    'title',
    SAMPLE_ACCORDIONHEADER_TITLE,
    storybookPropsGroupID,
  );
  const isExpanded = boolean('isExpanded', false, storybookPropsGroupID);
  const horizontalAlignmentSelector = select(
    'horizontalAlignment',
    AccordionHeaderHorizontalAlignment,
    DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT,
    storybookPropsGroupID,
  );
  return {
    title: titleText,
    isExpanded,
    horizontalAlignment: horizontalAlignmentSelector,
  };
};

export const AccordionHeaderStory = () => (
  <AccordionHeader {...getAccordionHeaderStoryProps()} />
);

export default AccordionHeaderStory;
