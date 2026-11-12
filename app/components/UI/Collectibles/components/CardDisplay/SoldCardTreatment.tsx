import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

/** Static compact adaptation of Replit SoldCardBanner; large results retain the original CSS animation. */
export default function SoldCardTreatment({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box twClassName="relative overflow-hidden">
      <Box twClassName="opacity-50">{children}</Box>
      <Box
        pointerEvents="none"
        twClassName="absolute inset-0 items-center justify-center"
        accessibilityLabel={label}
      >
        <Box
          twClassName="w-full py-1 items-center"
          style={{
            backgroundColor: brandColor.red400,
            transform: [{ rotate: '-14deg' }],
          }}
        >
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
            adjustsFontSizeToFit
            twClassName="px-2"
            style={{ color: brandColor.grey000 }}
          >
            {label.toLocaleUpperCase()}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
