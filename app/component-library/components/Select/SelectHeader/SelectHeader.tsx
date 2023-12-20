/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import HeaderBase from '../../HeaderBase';
import Text from '../../Texts/Text';

// Internal dependencies.
import { SelectHeaderProps } from './SelectHeader.types';
import {
  DEFAULT_SELECTHEADER_TITLE_TEXTCOLOR,
  DEFAULT_SELECTHEADER_TITLE_TEXTVARIANT,
  DEFAULT_SELECTHEADER_DESCRIPTION_TEXTCOLOR,
  DEFAULT_SELECTHEADER_DESCRIPTION_TEXTVARIANT,
} from './SelectHeader.constants';

const SelectHeader: React.FC<SelectHeaderProps> = ({
  children,
  title,
  description,
  ...props
}) => {
  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text
        variant={DEFAULT_SELECTHEADER_TITLE_TEXTVARIANT}
        color={DEFAULT_SELECTHEADER_TITLE_TEXTCOLOR}
      >
        {title}
      </Text>
    ) : (
      title
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_SELECTHEADER_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_SELECTHEADER_DESCRIPTION_TEXTCOLOR}
      >
        {description}
      </Text>
    ) : (
      description
    );
  return (
    <HeaderBase {...props}>
      {title && renderTitle()}
      {description && renderDescription()}
      {children}
    </HeaderBase>
  );
};

export default SelectHeader;
