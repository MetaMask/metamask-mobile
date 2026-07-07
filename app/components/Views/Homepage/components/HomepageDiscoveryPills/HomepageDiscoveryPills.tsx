import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import HomepageDiscoveryPillIcon from './HomepageDiscoveryPillIcon';
import {
  HOMEPAGE_DISCOVERY_PILL_IDS,
  type HomepageDiscoveryPillId,
} from './homepageDiscoveryPills.constants';
import { HomepageDiscoveryPillsTestIds } from './HomepageDiscoveryPills.testIds';
import type { HomepageDiscoveryPillsProps } from './HomepageDiscoveryPills.types';
import usePillViewedEvent from '../../hooks/usePillViewedEvent';
import { useHomepageDiscoveryPillsNavigation } from './useHomepageDiscoveryPillsNavigation';

const PILL_LABEL_KEYS: Record<
  HomepageDiscoveryPillId,
  | 'homepage.sections.perpetuals'
  | 'homepage.sections.predictions'
  | 'trending.stocks'
  | 'trending.crypto'
> = {
  perpetuals: 'homepage.sections.perpetuals',
  predictions: 'homepage.sections.predictions',
  stocks: 'trending.stocks',
  crypto: 'trending.crypto',
};

const HomepageDiscoveryPills: React.FC<HomepageDiscoveryPillsProps> = ({
  iconStyle,
  onPillPress,
}) => {
  const tw = useTailwind();
  const { navigateToPill } = useHomepageDiscoveryPillsNavigation();
  const { trackPillTapped } = usePillViewedEvent();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const visiblePillIds = useMemo(
    () =>
      HOMEPAGE_DISCOVERY_PILL_IDS.filter((pillId) => {
        if (pillId === 'perpetuals') {
          return isPerpsEnabled;
        }
        if (pillId === 'predictions') {
          return isPredictEnabled;
        }
        return true;
      }),
    [isPerpsEnabled, isPredictEnabled],
  );

  const handlePillPress = useCallback(
    (pillId: HomepageDiscoveryPillId, position: number) => {
      trackPillTapped(pillId, position);
      onPillPress?.(pillId, position);
      navigateToPill(pillId);
    },
    [navigateToPill, onPillPress, trackPillTapped],
  );

  if (visiblePillIds.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('grow-0')}
      contentContainerStyle={tw.style('flex-row items-center gap-2 px-4')}
      testID={HomepageDiscoveryPillsTestIds.CONTAINER}
    >
      {visiblePillIds.map((pillId) => (
        <ButtonToggle
          key={pillId}
          label={
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <HomepageDiscoveryPillIcon
                pillId={pillId}
                iconStyle={iconStyle}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings(PILL_LABEL_KEYS[pillId])}
              </Text>
            </Box>
          }
          isActive={false}
          onPress={() =>
            handlePillPress(pillId, HOMEPAGE_DISCOVERY_PILL_IDS.indexOf(pillId))
          }
          size={ButtonSize.Md}
          style={tw.style('rounded-xl py-2 pl-2 pr-3')}
          testID={HomepageDiscoveryPillsTestIds.pill(pillId)}
          accessibilityLabel={strings(PILL_LABEL_KEYS[pillId])}
        />
      ))}
    </ScrollView>
  );
};

export default HomepageDiscoveryPills;
