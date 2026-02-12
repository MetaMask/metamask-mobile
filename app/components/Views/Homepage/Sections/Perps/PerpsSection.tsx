import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const title = 'Trending perps';

  const refresh = useCallback(async () => {
    // TODO: Implement perps refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPerps} />
      <SectionRow>
        <SectionCard>
          <Text>Perps content placeholder :)</Text>
        </SectionCard>
      </SectionRow>
    </Box>
  );
});

export default PerpsSection;
