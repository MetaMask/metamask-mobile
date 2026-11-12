import React from 'react';
import {
  FontWeight,
  Tag,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

/** Replit GradingBadge: compact visual grade, full provider description for accessibility. */
export default function GradingBadge({
  label,
  testID,
}: {
  label: string;
  testID?: string;
}) {
  const company = label.match(/^(PSA|CGC|BGS|Beckett|SGC)\b/i)?.[1];
  const numericGrade = label.match(/\b\d+(?:\.\d+)?\b/)?.[0];
  return (
    <Tag
      accessibilityLabel={label}
      twClassName="shrink self-center rounded-full border border-muted bg-transparent px-1.5 py-0"
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        testID={testID}
      >
        {company && numericGrade ? `${company} ${numericGrade}` : label}
      </Text>
    </Tag>
  );
}
