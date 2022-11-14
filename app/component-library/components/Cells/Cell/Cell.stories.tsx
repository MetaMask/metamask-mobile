/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarProps } from '../../Avatars/Avatar/Avatar.types';
import { getAvatarStoryProps } from '../../Avatars/Avatar/Avatar.stories';

// Internal dependencies.
import Cell from './Cell';
import {
  SAMPLE_CELL_TITLE,
  SAMPLE_CELL_SECONDARY_TEXT,
  SAMPLE_CELL_TERTIARY_TEXT,
  SAMPLE_TAG_LABEL_TEXT,
} from './Cell.constants';
import { CellVariants } from './Cell.types';

storiesOf('Component Library / Cell', module).add('Default', () => {
  const groupId = 'Props';
  const cellVariantsSelector = select(
    'Variant',
    CellVariants,
    CellVariants.Display,
    groupId,
  );
  const avatarProps: AvatarProps = getAvatarStoryProps();
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
  const isSelected =
    cellVariantsSelector === CellVariants.Multiselect ||
    cellVariantsSelector === CellVariants.Select
      ? boolean('isSelected?', false, groupId)
      : undefined;

  switch (cellVariantsSelector) {
    case CellVariants.Display:
      return (
        <Cell
          variant={cellVariantsSelector}
          avatarProps={avatarProps}
          title={titleText}
          secondaryText={secondaryText}
          tertiaryText={tertiaryText}
          tagLabel={tagLabel}
        />
      );
    default:
      return (
        <Cell
          variant={cellVariantsSelector}
          avatarProps={avatarProps}
          title={titleText}
          secondaryText={secondaryText}
          tertiaryText={tertiaryText}
          tagLabel={tagLabel}
          isSelected={isSelected}
          onPress={() => Alert.alert('Pressed account Cell!')}
        />
      );
  }
});
