/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  IconName,
  IconProps,
} from '../../../component-library/components/Icon';
import TextWithPrefixIcon from '../../../component-library/components/Texts/TextWithPrefixIcon';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

// Internal dependencies.
import {
  TILDE_ICON_SIZE_BY_TEXT_VARIANT,
  TEXT_ESTIMATED_TEST_ID,
} from './TextEstimated.constants';
import { TextEstimatedProps } from './TextEstimated.types';

const TextEstimated: React.FC<TextEstimatedProps> = ({
  variant = TextVariant.BodyMD,
  children,
  ...props
}) => {
  const iconProps: IconProps = {
    name: IconName.TildeOutline,
    size: TILDE_ICON_SIZE_BY_TEXT_VARIANT[variant],
  };
  return (
    <TextWithPrefixIcon
      iconProps={iconProps}
      variant={variant}
      testID={TEXT_ESTIMATED_TEST_ID}
      {...props}
    >
      {children}
    </TextWithPrefixIcon>
  );
};

export default TextEstimated;
