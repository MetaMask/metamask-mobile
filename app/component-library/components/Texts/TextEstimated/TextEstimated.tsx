/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { IconName, IconProps } from '../../Icon';
import TextWithPrefixIcon from '../TextWithPrefixIcon';
import { TextVariant } from '../Text/Text.types';

// Internal dependencies.
import { TILDE_ICON_SIZE_BY_TEXT_VARIANT } from './TextEstimated.constants';
import { TextEstimatedProps } from './TextEstimated.types';

const TextEstimated: React.FC<TextEstimatedProps> = ({
  variant = TextVariant.sBodyMD,
  children,
  ...props
}) => {
  const iconProps: IconProps = {
    name: IconName.TildeOutline,
    size: TILDE_ICON_SIZE_BY_TEXT_VARIANT[variant],
  };
  return (
    <TextWithPrefixIcon iconProps={iconProps} {...props}>
      {children}
    </TextWithPrefixIcon>
  );
};

export default TextEstimated;
