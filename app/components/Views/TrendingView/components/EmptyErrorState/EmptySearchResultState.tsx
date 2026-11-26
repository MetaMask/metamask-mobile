import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

const EmptySearchResultState: React.FC = () => (
  <Box
    testID="empty-search-result-state"
    className="flex-col pt-9 pb-24 justify-center items-center gap-3 flex-1"
  >
    <Box className="flex-col w-[337px] items-stretch">
      <Text
        variant={TextVariant.HeadingSm}
        className="text-default text-center self-stretch mb-2"
      >
        {strings('trending.empty_search_result_state.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        className="text-alternative text-center self-stretch font-medium"
      >
        {strings('trending.empty_search_result_state.description')}
      </Text>
    </Box>
  </Box>
);

export default EmptySearchResultState;
