import React from 'react';
import BaseListItem from '@components/Base/ListItem';
import BaseText from '@components/Base/Text';
import Box from '@components/UI/Ramp/components/Box';
import Row from '@components/UI/Ramp/components/Row';
import SkeletonBox from '@components/UI/Ramp/components/SkeletonBox';
import SkeletonText from '@components/UI/Ramp/components/SkeletonText';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListItem = BaseListItem as any;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Text = BaseText as any;

const SkeletonPaymentMethod = () => (
  <Box>
    <ListItem.Content>
      <ListItem.Icon>
        <SkeletonBox />
      </ListItem.Icon>
      <ListItem.Body>
        <ListItem.Title>
          <SkeletonText thin title />
        </ListItem.Title>
      </ListItem.Body>
      <ListItem.Amounts>
        <Text>
          <SkeletonText medium /> <SkeletonText medium />
        </Text>
      </ListItem.Amounts>
    </ListItem.Content>
    <Row />
    <ListItem.Content>
      <SkeletonText thin medium />
    </ListItem.Content>
  </Box>
);

export default SkeletonPaymentMethod;
