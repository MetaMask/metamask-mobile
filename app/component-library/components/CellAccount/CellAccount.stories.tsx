/* eslint-disable no-console */
// 3rd party dependencies
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies
import { AccountAvatarType } from '../AccountAvatar';

// Internal dependencies
import CellAccount from './CellAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  TEST_CELL_ACCOUNT_SECONDARY_TEXT,
  TEST_CELL_ACCOUNT_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from './CellAccount.constants';

storiesOf('Component Library / Cell', module).add('Default', () => {
  const groupId = 'Props';
  const isMultiSelect = boolean('IsMultiSelect?', false, groupId);
  const titleText = text('title', TEST_CELL_ACCOUNT_TITLE, groupId);
  const includeSecondaryText = boolean(
    'Includes secondaryText?',
    false,
    groupId,
  );
  const secondaryText = includeSecondaryText
    ? text('secondaryText', TEST_CELL_ACCOUNT_SECONDARY_TEXT, groupId)
    : '';
  const includeTertiaryText = boolean('Includes tertiaryText?', false, groupId);
  const tertiaryText = includeTertiaryText
    ? text('tertiaryText', TEST_CELL_ACCOUNT_TERTIARY_TEXT, groupId)
    : '';
  const includeTagLabel = boolean('Includes label?', false, groupId);
  const tagLabel = includeTagLabel
    ? text('label', TEST_TAG_LABEL_TEXT, groupId)
    : '';
  const isSelected = boolean('isSelected?', false, groupId);

  return (
    <CellAccount
      accountAddress={TEST_ACCOUNT_ADDRESS}
      accountAvatarType={AccountAvatarType.JazzIcon}
      title={titleText}
      secondaryText={secondaryText}
      tertiaryText={tertiaryText}
      tagLabel={tagLabel}
      isSelected={isSelected}
      isMultiSelect={isMultiSelect}
      onPress={() => Alert.alert('Pressed account Cell!')}
    />
  );
});
