import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const AssetLabel = ({ label }: { label: string }) => {
  const tw = useTailwind();
  return (
    <Box twClassName="rounded px-1.5 py-0.5" style={tw.style('bg-muted')}>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
    </Box>
  );
};

export default AssetLabel;
