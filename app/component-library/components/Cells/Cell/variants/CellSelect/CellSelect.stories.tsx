/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import {
  TEST_AVATAR_PROPS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';

// Internal dependencies.
import CellSelect from './CellSelect';

storiesOf('Component Library / CellSelect', module).add('Default', () => {
  const groupId = 'Props';
  const titleText = text('title', TEST_CELL_TITLE, groupId);
  const includeSecondaryText = boolean(
    'Includes secondaryText?',
    false,
    groupId,
  );
  const secondaryText = includeSecondaryText
    ? text('secondaryText', TEST_CELL_SECONDARY_TEXT, groupId)
    : '';
  const includeTertiaryText = boolean('Includes tertiaryText?', false, groupId);
  const tertiaryText = includeTertiaryText
    ? text('tertiaryText', TEST_CELL_TERTIARY_TEXT, groupId)
    : '';
  const includeTagLabel = boolean('Includes label?', false, groupId);
  const tagLabel = includeTagLabel
    ? text('label', TEST_TAG_LABEL_TEXT, groupId)
    : '';
  const isSelected = boolean('isSelected?', false, groupId);

  return (
    <CellSelect
      variant={CellVariants.Select}
      avatarProps={TEST_AVATAR_PROPS}
      title={titleText}
      secondaryText={secondaryText}
      tertiaryText={tertiaryText}
      tagLabel={tagLabel}
      isSelected={isSelected}
      onPress={() => Alert.alert('Pressed account Cell!')}
    />
  );
});
