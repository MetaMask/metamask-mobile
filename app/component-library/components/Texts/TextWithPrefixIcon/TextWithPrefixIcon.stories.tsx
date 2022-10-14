// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { IconName, IconProps, IconSize } from '../../Icon';
import { TextVariants } from '../Text/Text.types';

// Internal dependencies.
import TextWithPrefixIcon from './TextWithPrefixIcon';
import { TEST_SAMPLE_TEXT } from './TextWithPrefixIcon.constants';

storiesOf('Component Library / TextWithPrefixIcon', module).add(
  'Default',
  () => {
    const groupId = 'Props';
    const iconNameSelector = select(
      'iconProps.name',
      IconName,
      IconName.LockFilled,
      groupId,
    );
    const iconSizeSelector = select(
      'iconProps.size',
      IconSize,
      IconSize.Md,
      groupId,
    );
    const textVariantsSelector = select(
      'Variant',
      TextVariants,
      TextVariants.lBodyMD,
      groupId,
    );
    const inputText = text('Text', TEST_SAMPLE_TEXT, groupId);
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
