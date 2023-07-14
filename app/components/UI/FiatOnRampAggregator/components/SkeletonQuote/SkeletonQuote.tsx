import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import BaseListItem from '../../../../Base/ListItem';
import Box from '../Box';
import SkeletonText from '../SkeletonText';

// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;

const SkeletonQuote = ({
  collapsed,
  style,
}: {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <Box style={style}>
    <ListItem.Content>
      <ListItem.Body>
        <ListItem.Title>
          <SkeletonText title />
        </ListItem.Title>
      </ListItem.Body>
      <ListItem.Amounts>
        <SkeletonText medium />
      </ListItem.Amounts>
    </ListItem.Content>
    {!collapsed && (
      <>
        <ListItem.Content>
          <ListItem.Body>
            <SkeletonText thin />
          </ListItem.Body>
          <ListItem.Amounts>
            <SkeletonText thin spacingVertical small />
          </ListItem.Amounts>
        </ListItem.Content>
      </>
    )}
  </Box>
);

export default SkeletonQuote;
