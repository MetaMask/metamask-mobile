import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import { formatTokenAge } from '../../../utils/formatTokenAge';

export const TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID = 'token-details-v1-age-chip';

interface TokenAgeChipProps {
  launchedAtSeconds: number | null | undefined;
  onPress: () => void;
}

const TokenAgeChip = ({ launchedAtSeconds, onPress }: TokenAgeChipProps) => {
  const launchedAtMs =
    launchedAtSeconds != null && launchedAtSeconds > 0
      ? launchedAtSeconds * 1000
      : undefined;
  useElapsedTime({ since: launchedAtMs });
  const label = formatTokenAge(launchedAtSeconds);

  if (!label) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings('token_details_v1.age.accessibility_label', {
        age: label,
      })}
      testID={TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID}
    >
      <Tag severity={TagSeverity.Neutral} twClassName="self-center shrink-0">
        {label}
      </Tag>
    </Pressable>
  );
};

export default memo(TokenAgeChip);
