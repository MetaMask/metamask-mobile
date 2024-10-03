import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import BaseListItem from '@components/Base/ListItem';
import Box from  '@components/UI/Ramp/components/Box';
import SkeletonText from '@components/UI/Ramp/components/SkeletonText';

// TODO: Convert into typescript and correctly type
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
