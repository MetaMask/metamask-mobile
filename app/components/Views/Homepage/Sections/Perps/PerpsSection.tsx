import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { strings } from '../../../../../../locales/i18n';

const TITLE = strings('homepage.sections.perpetuals');

/**
 * PerpsSection - Displays perpetual trading markets on the homepage
 *
 * Only renders when the perps feature flag is enabled.
 */
const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const refresh = useCallback(async () => {
    // TODO: Implement perps refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  // Don't render if perps is disabled
  if (!isPerpsEnabled) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={TITLE} onPress={handleViewAllPerps} />
      <SectionRow>
        <>{/* Perps content will be added here */}</>
      </SectionRow>
    </Box>
  );
});

export default PerpsSection;
