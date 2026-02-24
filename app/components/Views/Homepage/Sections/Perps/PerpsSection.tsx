import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { strings } from '../../../../../../locales/i18n';
import useHomepageSectionViewedEvent, {
  HomepageSectionNames,
} from '../../hooks/useHomepageSectionViewedEvent';

interface PerpsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * PerpsSection - Displays perpetual trading markets on the homepage
 *
 * Only renders when the perps feature flag is enabled.
 */
const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const navigation = useNavigation();
    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const title = strings('homepage.sections.perpetuals');
    const sectionViewRef = useRef<View>(null);

    useHomepageSectionViewedEvent({
      sectionRef: isPerpsEnabled ? sectionViewRef : null,
      isLoading: false,
      sectionName: HomepageSectionNames.PERPS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: true,
      itemCount: 0,
    });

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
      <View ref={sectionViewRef}>
        <Box gap={3}>
          <SectionTitle title={title} onPress={handleViewAllPerps} />
          <SectionRow>
            <>{/* Perps content will be added here */}</>
          </SectionRow>
        </Box>
      </View>
    );
  },
);

export default PerpsSection;
