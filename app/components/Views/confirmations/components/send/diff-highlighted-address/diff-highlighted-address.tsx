import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface DiffHighlightedAddressProps {
  address: string;
  diffIndices: number[];
  label: string;
  dotTwColor: string;
  highlightTwColor?: string;
  diffTextColor?: TextColor;
}

/**
 * Renders an address inside a rounded card with differing characters
 * highlighted. Used in the address poisoning warning to let users
 * visually compare the entered and known addresses.
 */
export const DiffHighlightedAddress = ({
  address,
  diffIndices,
  label,
  dotTwColor,
  highlightTwColor = 'bg-error-muted',
  diffTextColor = TextColor.ErrorDefault,
}: DiffHighlightedAddressProps) => {
  const diffSet = new Set(diffIndices);

  // Build segments of consecutive same/diff characters
  const segments: { text: string; isDiff: boolean }[] = [];
  let currentSegment = { text: '', isDiff: false };

  for (let i = 0; i < address.length; i++) {
    const isDiff = diffSet.has(i);
    if (i === 0) {
      currentSegment = { text: address[i], isDiff };
    } else if (isDiff === currentSegment.isDiff) {
      currentSegment.text += address[i];
    } else {
      segments.push(currentSegment);
      currentSegment = { text: address[i], isDiff };
    }
  }
  segments.push(currentSegment);

  return (
    <Box twClassName="rounded-lg bg-background-alternative p-3">
      <Box twClassName="flex-row items-center mb-2">
        <Box twClassName={`w-2 h-2 rounded-full mr-1.5 mt-0.5 ${dotTwColor}`} />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {label}
        </Text>
      </Box>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {segments.map((segment, index) => (
          <Text
            key={`${index}-${segment.isDiff}`}
            variant={TextVariant.BodySm}
            color={segment.isDiff ? diffTextColor : TextColor.TextAlternative}
            fontWeight={segment.isDiff ? FontWeight.Bold : undefined}
            twClassName={segment.isDiff ? highlightTwColor : undefined}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    </Box>
  );
};
