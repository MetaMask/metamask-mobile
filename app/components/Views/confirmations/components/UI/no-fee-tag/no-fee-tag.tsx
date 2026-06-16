import React from 'react';
import { Box, Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

export function NoFeeTag() {
  return (
    <Box twClassName="shrink-0">
      <Tag severity={TagSeverity.Info}>
        {strings('money.potential_earnings.no_fee')}
      </Tag>
    </Box>
  );
}
