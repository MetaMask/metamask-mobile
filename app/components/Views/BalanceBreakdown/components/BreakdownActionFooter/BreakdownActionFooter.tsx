import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { SliceKey } from '../../types';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';

interface Props {
  selectedSlice: SliceKey | 'all';
}

const SLICE_NAV_CONFIG: Partial<
  Record<SliceKey, { label: string; route: string; params?: Record<string, unknown> }>
> = {
  tokens: {
    label: 'View Tokens',
    route: Routes.WALLET.TOKENS_FULL_VIEW,
  },
  defi: {
    label: 'View DeFi Positions',
    route: Routes.WALLET.DEFI_FULL_VIEW,
  },
  // Perps and Predict navigate to their home views via the bottom tab bar
  // so no dedicated route config needed here — handled via tabPress
};

const BreakdownActionFooter: React.FC<Props> = ({ selectedSlice }) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const config =
    selectedSlice !== 'all' ? SLICE_NAV_CONFIG[selectedSlice] : undefined;

  const handlePress = useCallback(() => {
    if (!config) {
      return;
    }
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.BALANCE_BREAKDOWN_DRILLDOWN_CTA_TAPPED,
      )
        .addProperties({
          slice: selectedSlice,
          route: config.route,
        })
        .build(),
    );
    navigation.navigate(config.route, config.params);
  }, [config, createEventBuilder, navigation, selectedSlice, trackEvent]);

  if (!config) {
    return null;
  }

  return (
    <Box
      alignItems={BoxAlignItems.Stretch}
      twClassName="w-full px-4 mb-4"
    >
      <Button
        variant={ButtonVariant.Secondary}
        isFullWidth
        onPress={handlePress}
        testID={BalanceBreakdownTestIds.ACTION_BUTTON}
      >
        {config.label}
      </Button>
    </Box>
  );
};

export default BreakdownActionFooter;
