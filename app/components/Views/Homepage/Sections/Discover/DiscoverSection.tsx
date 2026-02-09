import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import SectionRow from '../../components/SectionRow';
import { SectionRefreshHandle } from '../../types';

const DiscoverSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const title = 'Discover more';

  const refresh = useCallback(async () => {
    // TODO: Implement discover refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} />
      <SectionRow>
        <SectionCard>
          <Text>Discover content placeholder :)</Text>
        </SectionCard>
      </SectionRow>
    </Box>
  );
});

export default DiscoverSection;
