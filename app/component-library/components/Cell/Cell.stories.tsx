/* eslint-disable no-console */
// 3rd party dependencies
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// Base dependencies
import Cell from './Cell';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_LABEL_TEXT,
} from './Cell.constants';
import { AccountAvatarType } from '../AccountAvatar';

storiesOf('Component Library / Cell', module)
  .add('Default', () => {
    const groupId = 'Props';
    const isMultiSelect = boolean('IsMultiSelect?', false, groupId);
    const titleText = text('title', TEST_CELL_TITLE, groupId);
    const includeSecondaryText = boolean('Includes secondaryText?', false, groupId);
    const secondaryText = includeSecondaryText ? text('secondaryText', TEST_CELL_SECONDARY_TEXT, groupId) : '';
    const includeTertiaryText = boolean('Includes tertiaryText?', false, groupId);
    const tertiaryText = includeTertiaryText ? text('tertiaryText', TEST_CELL_TERTIARY_TEXT, groupId) : '';
    const includeLabel = boolean('Includes label?', false, groupId);
    const label = includeLabel ? text('label', TEST_LABEL_TEXT, groupId) : '';
    const isSelected = boolean('isSelected?', false, groupId);

    return (
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={titleText}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        label={label}
        isSelected = {isSelected}
        isMultiSelect = {isMultiSelect}
        onPress={() => Alert.alert('Pressed account Cell!')}
      />
    );
  })
