import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const PredictionsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const title = 'Hottest predictions';

  const refresh = useCallback(async () => {
    // TODO: Implement predictions refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPredictions} />
      <SectionRow>
        <SectionCard>
          <Text>Predictions content placeholder :)</Text>
        </SectionCard>
      </SectionRow>
    </Box>
  );
});

export default PredictionsSection;
