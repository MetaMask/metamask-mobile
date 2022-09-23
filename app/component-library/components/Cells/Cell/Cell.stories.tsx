/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert } from 'react-native';
import { boolean, text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import { AvatarProps, AvatarVariants } from '../../Avatars/Avatar.types';
import {
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from '../../Avatars/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import Cell from './Cell';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
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
  const avatarVariantsSelector = select(
    'Avatar Variant',
    AvatarVariants,
    AvatarVariants.Account,
    groupId,
  );
  let avatarProps: AvatarProps;
  switch (avatarVariantsSelector) {
    case AvatarVariants.Account:
      avatarProps = {
        variant: AvatarVariants.Account,
        accountAddress: TEST_ACCOUNT_ADDRESS,
        type: AvatarAccountType.JazzIcon,
      };
      break;
    case AvatarVariants.Favicon:
      avatarProps = {
        variant: AvatarVariants.Favicon,
        imageSource: TEST_LOCAL_IMAGE_SOURCE,
      };
      break;
    case AvatarVariants.Network:
      avatarProps = {
        variant: AvatarVariants.Network,
        name: TEST_NETWORK_NAME,
        imageSource: TEST_LOCAL_IMAGE_SOURCE,
      };
      break;
    case AvatarVariants.Token:
      avatarProps = {
        variant: AvatarVariants.Token,
        name: TEST_NETWORK_NAME,
        imageSource: TEST_LOCAL_IMAGE_SOURCE,
      };
      break;
  }
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
