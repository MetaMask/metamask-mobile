/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useTokenListTemplate } from '../TokenListItem/TokenListItem.hooks';
import ListSelect from '../../List/ListSelect';

// Internal dependencies.
import { TokenListSelectProps } from './TokenListSelect.types';

const TokenListSelect: React.FC<TokenListSelectProps> = ({
  options = [],
  ...props
}) => {
  const transformedOptions = useTokenListTemplate(options);
  return <ListSelect {...props} options={transformedOptions} />;
};

export default TokenListSelect;
