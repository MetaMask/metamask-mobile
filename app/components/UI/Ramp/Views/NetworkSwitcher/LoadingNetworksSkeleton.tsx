import React from 'react';
import BaseListItem from '../../../../Base/ListItem';
import Row from '../../components/Row';
import SkeletonText from '../../components/SkeletonText';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListItem = BaseListItem as any;

function LoadingNetworkSkeleton() {
  return (
    <ListItem.Content>
      <ListItem.Body>
        <SkeletonText large />
      </ListItem.Body>
      <ListItem.Amounts>
        <SkeletonText medium />
      </ListItem.Amounts>
    </ListItem.Content>
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
