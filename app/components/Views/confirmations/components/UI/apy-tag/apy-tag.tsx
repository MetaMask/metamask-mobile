import React from 'react';
import { Box, Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

interface ApyTagProps {
  apyPercent: number;
  testID?: string;
}

export function ApyTag({ apyPercent, testID = 'apy-tag' }: ApyTagProps) {
  return (
    <Box twClassName="shrink-0">
      <Tag severity={TagSeverity.Success} testID={testID}>
        {strings('earn_module.rate_apy', { percentage: apyPercent })}
      </Tag>
    </Box>
  );
}
