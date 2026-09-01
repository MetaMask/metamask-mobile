import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

const LegalLink = ({
  onPress,
  testID,
  children,
}: {
  onPress: () => void;
  testID: string;
  children: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-1 py-1"
  >
    <Text
      variant={TextVariant.BodyMd}
      twClassName="underline"
      onPress={onPress}
      testID={testID}
    >
      {children}
    </Text>
    <Icon
      name={IconName.Export}
      size={IconSize.Sm}
      color={IconColor.IconDefault}
    />
  </Box>
);

export default LegalLink;
