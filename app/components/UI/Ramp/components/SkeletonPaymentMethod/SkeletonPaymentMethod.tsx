import React from 'react';
import BaseListItem from '../../../../Base/ListItem';
import BaseText from '../../../../Base/Text';
import Box from '../Box';
import Row from '../Row';
import SkeletonBox from '../SkeletonBox';
import SkeletonText from '../SkeletonText';

const ListItem = BaseListItem as any;
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
