import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Box from '../Box';
import SkeletonText from '../SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import ListItemColumnEnd from '../ListItemColumnEnd';

const SkeletonQuote = ({
  collapsed,
  style,
}: {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <Box style={style} compact>
    <ListItem>
      <ListItemColumn>
        <SkeletonText title />
      </ListItemColumn>
      <ListItemColumnEnd widthType={WidthType.Fill}>
        <SkeletonText small />
      </ListItemColumnEnd>
    </ListItem>
    {!collapsed && (
      <>
        <ListItem>
          <ListItemColumn widthType={WidthType.Fill}>
            <SkeletonText thin />
          </ListItemColumn>
          <ListItemColumnEnd widthType={WidthType.Fill}>
            <SkeletonText thin small />
          </ListItemColumnEnd>
        </ListItem>
      </>
    )}
  </Box>
);

export default SkeletonQuote;
