// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { IconName, IconProps, IconSize } from '../../Icon';
import { TextVariant } from '../Text/Text.types';

// Internal dependencies.
import TextWithPrefixIcon from './TextWithPrefixIcon';

storiesOf('Component Library / TextWithPrefixIcon', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const iconNameSelector = select(
      'Icon name',
      IconName,
      IconName.LockFilled,
      groupId,
    );
    const iconSizeSelector = select(
      'Icon size',
      IconSize,
      IconSize.Md,
      groupId,
    );
    const textVariantsSelector = select(
      'Variant',
      TextVariant,
      TextVariant.lBodyMD,
      groupId,
    );
    const inputText = text('Text', 'Sample Text', groupId);
    const iconProps: IconProps = {
      name: iconNameSelector,
      size: iconSizeSelector,
    };

    return (
      <TextWithPrefixIcon variant={textVariantsSelector} iconProps={iconProps}>
        {inputText}
      </TextWithPrefixIcon>
    );
  },
);
