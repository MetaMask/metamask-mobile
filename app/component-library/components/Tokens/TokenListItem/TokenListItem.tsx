/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import ListItem from '../../ListItem/ListItem';

// Internal dependencies.
import styleSheet from './TokenListItem.styles';
import { TokenListItemProps } from './TokenListItem.types';
import { useTokenListItemTemplate } from './TokenListItem.hooks';

const TokenListItem: React.FC<TokenListItemProps> = ({ style, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });

  const tokenListItemTemplateObject = useTokenListItemTemplate({
    ...props,
  });
  return <ListItem style={styles.base} {...tokenListItemTemplateObject} />;
};
export default TokenListItem;
