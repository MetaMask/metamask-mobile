import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import { strings } from '../../../../../../locales/i18n';

/**
 * PredictionsSection - Displays prediction markets on the homepage
 *
 * Only renders when the predict feature flag is enabled.
 */
const PredictionsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const title = strings('homepage.sections.predictions');

  const refresh = useCallback(async () => {
    // TODO: Implement predictions refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  // Don't render if predict is disabled
  if (!isPredictEnabled) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPredictions} />
      <SectionRow>
        <>{/* Predictions content will be added here */}</>
      </SectionRow>
    </Box>
  );
});

export default PredictionsSection;
