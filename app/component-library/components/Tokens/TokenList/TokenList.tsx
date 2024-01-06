/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import TokenListItem from '../TokenListItem/TokenListItem';
import ValueList from '../../ValueList/ValueList';

// Internal dependencies.
import { TokenListProps } from './TokenList.types';

const TokenList: React.FC<TokenListProps> = ({ options, ...props }) => (
  <ValueList options={options} SkinComponent={TokenListItem} {...props} />
);

export default TokenList;
