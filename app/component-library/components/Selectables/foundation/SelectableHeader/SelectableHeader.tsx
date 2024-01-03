/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import HeaderBase from '../../../HeaderBase';
import Text from '../../../Texts/Text';

// Internal dependencies.
import { SelectableHeaderProps } from './SelectableHeader.types';
import {
  DEFAULT_SELECTABLEHEADER_TITLE_TEXTCOLOR,
  DEFAULT_SELECTABLEHEADER_TITLE_TEXTVARIANT,
  DEFAULT_SELECTABLEHEADER_DESCRIPTION_TEXTCOLOR,
  DEFAULT_SELECTABLEHEADER_DESCRIPTION_TEXTVARIANT,
} from './SelectableHeader.constants';

const SelectableHeader: React.FC<SelectableHeaderProps> = ({
  children,
  title,
  description,
  ...props
}) => {
  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text
        variant={DEFAULT_SELECTABLEHEADER_TITLE_TEXTVARIANT}
        color={DEFAULT_SELECTABLEHEADER_TITLE_TEXTCOLOR}
      >
        {title}
      </Text>
    ) : (
      title
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_SELECTABLEHEADER_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_SELECTABLEHEADER_DESCRIPTION_TEXTCOLOR}
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

export default SelectableHeader;
