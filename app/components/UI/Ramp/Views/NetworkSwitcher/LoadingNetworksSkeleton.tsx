import React from 'react';
import { StyleSheet, View } from 'react-native';
import Row from '../../components/Row';
import SkeletonText from '../../components/SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';

const createStyles = () =>
  StyleSheet.create({
    listItem: {
      padding: 0,
    },
    alignEnd: {
      alignItems: 'flex-end',
    },
  });

function LoadingNetworkSkeleton() {
  const styles = createStyles();

  return (
    <ListItem style={styles.listItem}>
      <ListItemColumn widthType={WidthType.Fill}>
        <SkeletonText large />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <View style={styles.alignEnd}>
          <SkeletonText small />
        </View>
      </ListItemColumn>
    </ListItem>
  );
}

function LoadingNetworksSkeleton() {
  return (
    <>
      <Row first>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
      <Row>
        <LoadingNetworkSkeleton />
      </Row>
    </>
  );
}

export default LoadingNetworksSkeleton;
