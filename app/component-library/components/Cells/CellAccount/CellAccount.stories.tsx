/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import { CellAccountBaseItemType } from '../CellAccountBaseItem/CellAccountBaseItem.types';

// Internal dependencies.
import CellAccount from './CellAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  TEST_CELL_ACCOUNT_SECONDARY_TEXT,
  TEST_CELL_ACCOUNT_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from './CellAccount.constants';

storiesOf('Component Library / CellAccount', module).add('Default', () => {
  const groupId = 'Props';
  const cellAccountTypeSelector = select(
    'type',
    CellAccountBaseItemType,
    CellAccountBaseItemType.Display,
    groupId,
  );

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
  const isSelected =
    cellAccountTypeSelector === CellAccountBaseItemType.Multiselect ||
    cellAccountTypeSelector === CellAccountBaseItemType.Select
      ? boolean('isSelected?', false, groupId)
      : undefined;

  switch (cellAccountTypeSelector) {
    case CellAccountBaseItemType.Display:
      return (
        <CellAccount
          type={cellAccountTypeSelector}
          avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
          avatarAccountType={AvatarAccountType.JazzIcon}
          title={titleText}
          secondaryText={secondaryText}
          tertiaryText={tertiaryText}
          tagLabel={tagLabel}
        />
      );
    default:
      return (
        <CellAccount
          type={cellAccountTypeSelector}
          avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
          avatarAccountType={AvatarAccountType.JazzIcon}
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
