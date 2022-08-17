/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from '../../Cell.constants';
import { AvatarProps, AvatarVariants } from '../../../../Avatars/Avatar.types';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import { CellVariants } from '../../Cell.types';

storiesOf('Component Library / CellDisplay', module).add('Default', () => {
  const groupId = 'Props';
  const accountAvatarProps: AvatarProps = {
    variant: AvatarVariants.Account,
    accountAddress: TEST_ACCOUNT_ADDRESS,
    type: AvatarAccountType.JazzIcon,
  };
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

  return (
    <CellDisplay
      variant={CellVariants.Display}
      avatarProps={accountAvatarProps}
      title={titleText}
      secondaryText={secondaryText}
      tertiaryText={tertiaryText}
      tagLabel={tagLabel}
    />
  );
});
