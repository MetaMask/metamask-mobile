import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

const EmptySearchResultState: React.FC = () => (
  <Box
    testID="empty-search-result-state"
    className="flex-1 flex-col items-center justify-center gap-3 pb-24 pt-9"
  >
    <Box className="w-[337px] flex-col items-stretch">
      <Text
        variant={TextVariant.HeadingSm}
        className="mb-2 self-stretch text-center text-default"
      >
        {strings('trending.empty_search_result_state.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        className="self-stretch text-center font-medium text-alternative"
      >
        {strings('trending.empty_search_result_state.description')}
      </Text>
    </Box>
  </Box>
);

export default EmptySearchResultState;
