import React from 'react';
import { Box, Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

interface LastUsedTagProps {
  testID?: string;
}

export function LastUsedTag({
  testID = 'last-used-tag',
}: LastUsedTagProps = {}) {
  return (
    <Box twClassName="shrink-0">
      <Tag severity={TagSeverity.Info} testID={testID}>
        {strings('confirm.pay_with_bottom_sheet.last_used')}
      </Tag>
    </Box>
  );
}
