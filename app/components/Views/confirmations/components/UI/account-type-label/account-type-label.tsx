import React from 'react';
import {
  TextColor,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';

export const AccountTypeLabel = ({ label }: { label?: string }) => {
  if (!label) return null;
  return (
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      twClassName="bg-background-alternative ml-2 mt-1 py-0 px-1 rounded-md"
      numberOfLines={1}
    >
      {label}
    </Text>
  );
};
