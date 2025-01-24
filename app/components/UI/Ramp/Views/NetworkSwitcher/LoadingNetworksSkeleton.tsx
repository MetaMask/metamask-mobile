import React from 'react';
import { StyleSheet } from 'react-native';
import Row from '../../components/Row';
import SkeletonText from '../../components/SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import ListItemColumnEnd from '../../components/ListItemColumnEnd';

const createStyles = () =>
  StyleSheet.create({
    listItem: {
      padding: 0,
    },
  });

function LoadingNetworkSkeleton() {
  const styles = createStyles();

  return (
    <ListItem style={styles.listItem}>
      <ListItemColumn widthType={WidthType.Fill}>
        <SkeletonText large />
      </ListItemColumn>
      <ListItemColumnEnd widthType={WidthType.Fill}>
        <SkeletonText small />
      </ListItemColumnEnd>
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
