import React from 'react';
import { StyleProp, View, ViewStyle, StyleSheet } from 'react-native';
import Box from '../Box';
import SkeletonText from '../SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';

const createStyles = () =>
  StyleSheet.create({
    alignEnd: {
      alignItems: 'flex-end',
    },
  });

const SkeletonQuote = ({
  collapsed,
  style,
}: {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const styles = createStyles();

  return (
    <Box style={style} compact>
      <ListItem>
        <ListItemColumn>
          <SkeletonText title />
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.alignEnd}>
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
              <View style={styles.alignEnd}>
                <SkeletonText thin small />
              </View>
            </ListItemColumn>
          </ListItem>
        </>
      )}
    </Box>
  );
};

export default SkeletonQuote;
