/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { SAMPLE_AVATAR_PROPS } from '../../../../Avatars/Avatar/Avatar.constants';
import {
  SAMPLE_CELL_TITLE,
  SAMPLE_CELL_SECONDARY_TEXT,
  SAMPLE_CELL_TERTIARY_TEXT,
  SAMPLE_TAG_LABEL_TEXT,
} from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';

// Internal dependencies.
import CellMultiselect from './CellMultiselect';

storiesOf('Component Library / CellMultiselect', module).add('Default', () => {
  const groupId = 'Props';
  const titleText = text('title', SAMPLE_CELL_TITLE, groupId);
  const includeSecondaryText = boolean(
    'Includes secondaryText?',
    false,
    groupId,
  );
  const secondaryText = includeSecondaryText
    ? text('secondaryText', SAMPLE_CELL_SECONDARY_TEXT, groupId)
    : '';
  const includeTertiaryText = boolean('Includes tertiaryText?', false, groupId);
  const tertiaryText = includeTertiaryText
    ? text('tertiaryText', SAMPLE_CELL_TERTIARY_TEXT, groupId)
    : '';
  const includeTagLabel = boolean('Includes label?', false, groupId);
  const tagLabel = includeTagLabel
    ? text('label', SAMPLE_TAG_LABEL_TEXT, groupId)
    : '';
  const isSelected = boolean('isSelected?', false, groupId);

  return (
    <CellMultiselect
      variant={CellVariants.Multiselect}
      avatarProps={SAMPLE_AVATAR_PROPS}
      title={titleText}
      secondaryText={secondaryText}
      tertiaryText={tertiaryText}
      tagLabel={tagLabel}
      isSelected={isSelected}
      onPress={() => Alert.alert('Pressed account Cell!')}
    />
  );
});
