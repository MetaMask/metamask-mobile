import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Box from '../Box';
import SkeletonText from '../SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';

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
      <ListItemColumn widthType={WidthType.Fill}>
        <View style={{ alignItems: 'flex-end' }}>
          <SkeletonText small />
        </View>
      </ListItemColumn>
    </ListItem>
    {!collapsed && (
      <>
        <ListItem>
          <ListItemColumn widthType={WidthType.Fill}>
            <SkeletonText thin />
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <View style={{ alignItems: 'flex-end' }}>
              <SkeletonText thin small />
            </View>
          </ListItemColumn>
        </ListItem>
      </>
    )}
  </Box>
);

export default SkeletonQuote;
