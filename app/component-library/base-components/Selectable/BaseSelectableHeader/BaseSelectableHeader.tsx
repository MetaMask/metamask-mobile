/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import HeaderBase from '../../../components/HeaderBase';
import Text from '../../../components/Texts/Text';

// Internal dependencies.
import { BaseSelectableHeaderProps } from './BaseSelectableHeader.types';
import {
  DEFAULT_BASESELECTABLEHEADER_TITLE_TEXTCOLOR,
  DEFAULT_BASESELECTABLEHEADER_TITLE_TEXTVARIANT,
  DEFAULT_BASESELECTABLEHEADER_DESCRIPTION_TEXTCOLOR,
  DEFAULT_BASESELECTABLEHEADER_DESCRIPTION_TEXTVARIANT,
} from './BaseSelectableHeader.constants';

const BaseSelectableHeader: React.FC<BaseSelectableHeaderProps> = ({
  children,
  title,
  description,
  ...props
}) => {
  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text
        variant={DEFAULT_BASESELECTABLEHEADER_TITLE_TEXTVARIANT}
        color={DEFAULT_BASESELECTABLEHEADER_TITLE_TEXTCOLOR}
      >
        {title}
      </Text>
    ) : (
      title
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_BASESELECTABLEHEADER_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_BASESELECTABLEHEADER_DESCRIPTION_TEXTCOLOR}
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

export default BaseSelectableHeader;
