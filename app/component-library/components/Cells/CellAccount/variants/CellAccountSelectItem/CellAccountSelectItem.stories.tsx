/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  TEST_CELL_ACCOUNT_SECONDARY_TEXT,
  TEST_CELL_ACCOUNT_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from '../../CellAccount.constants';
import { CellAccountItemType } from '../../foundation/CellAccountBaseItem/CellAccountBaseItem.types';

// Internal dependencies.
import CellAccountSelectItem from './CellAccountSelectItem';

storiesOf('Component Library / CellAccountSelectItem', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const titleText = text('title', TEST_CELL_ACCOUNT_TITLE, groupId);
    const includeSecondaryText = boolean(
      'Includes secondaryText?',
      false,
      groupId,
    );
    const secondaryText = includeSecondaryText
      ? text('secondaryText', TEST_CELL_ACCOUNT_SECONDARY_TEXT, groupId)
      : '';
    const includeTertiaryText = boolean(
      'Includes tertiaryText?',
      false,
      groupId,
    );
    const tertiaryText = includeTertiaryText
      ? text('tertiaryText', TEST_CELL_ACCOUNT_TERTIARY_TEXT, groupId)
      : '';
    const includeTagLabel = boolean('Includes label?', false, groupId);
    const tagLabel = includeTagLabel
      ? text('label', TEST_TAG_LABEL_TEXT, groupId)
      : '';
    const isSelected = boolean('isSelected?', false, groupId);

    return (
      <CellAccountSelectItem
        type={CellAccountItemType.Select}
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
  },
);
