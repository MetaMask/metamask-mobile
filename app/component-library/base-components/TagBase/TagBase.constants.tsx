/* eslint-disable import/prefer-default-export */
// Third library dependencies.
import React from 'react';

// External dependencies
import Icon from '../../components/Icons/Icon';
import { SAMPLE_ICON_PROPS } from '../../components/Icons/Icon/Icon.constants';
import { SAMPLE_TEXT_PROPS } from '../../components/Texts/Text/Text.constants';
import { TextVariant } from '../../components/Texts/Text';

// Internal dependencies
import { TagShape, TagSeverity, TagBaseProps } from './TagBase.types';

// Defaults
export const DEFAULT_TAGBASE_SHAPE = TagShape.Pill;
export const DEFAULT_TAGBASE_SEVERITY = TagSeverity.Default;
export const DEFAULT_TAGBASE_GAP = 4;
export const DEFAULT_TAGBASE_TEXTVARIANT = TextVariant.BodySMMedium;

// Test IDs
export const TAGBASE_TESTID = 'tagbase';
export const TAGBASE_TEXT_TESTID = 'tagbase-text';

// Sample consts
const SAMPLE_TAGBASE_STARTACCESSORY = <Icon {...SAMPLE_ICON_PROPS} />;
const SAMPLE_TAGBASE_ENDACCESSORY = <Icon {...SAMPLE_ICON_PROPS} />;

export const SAMPLE_TAGBASE_PROPS: TagBaseProps = {
  startAccessory: SAMPLE_TAGBASE_STARTACCESSORY,
  endAccessory: SAMPLE_TAGBASE_ENDACCESSORY,
  children: 'Sample TagBase Children',
  textProps: SAMPLE_TEXT_PROPS,
  shape: DEFAULT_TAGBASE_SHAPE,
  gap: DEFAULT_TAGBASE_GAP,
  severity: DEFAULT_TAGBASE_SEVERITY,
};
