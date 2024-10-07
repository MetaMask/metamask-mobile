import React from 'react';
import Box from '../Box';
import SkeletonBox from '../SkeletonBox';
import SkeletonText from '../SkeletonText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text from '../../../../../component-library/components/Texts/Text';
import ListItemColumnEnd from '../ListItemColumnEnd';

const SkeletonPaymentMethod = () => (
  <Box compact>
    <ListItem
      bottomAccessoryGap={16}
      bottomAccessory={<SkeletonText thin medium />}
    >
      <ListItemColumn>
        <SkeletonBox />
      </ListItemColumn>

      <ListItemColumn>
        <SkeletonText thin title />
      </ListItemColumn>

      <ListItemColumnEnd widthType={WidthType.Fill}>
        <Text>
          <SkeletonText medium /> <SkeletonText medium />
        </Text>
      </ListItemColumnEnd>
    </ListItem>
  </Box>
);

export default SkeletonPaymentMethod;
