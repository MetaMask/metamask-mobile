import React, { useCallback, useMemo } from 'react';
import {
  Box,
  BottomSheetFooter,
  ButtonSize,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

/** Explainers that a bottom sheet shows inline instead of in a new sheet. */
export type PerpsInlineInfoContentKey =
  | 'margin'
  | 'liquidation_price'
  | 'cross_liquidation_price'
  | 'cross_no_liquidation_price'
  | 'cross_liquidation_estimate_unavailable'
  | 'liquidation_distance'
  | 'account_not_supported'
  | 'account_ratio'
  | 'maintenance_margin'
  | 'account_leverage'
  | 'cross_margin_usage';

interface PerpsInlineInfoScreenProps {
  contentKey: PerpsInlineInfoContentKey;
  onBack: () => void;
  /** Analytics location. Defaults to the trade sheet's asset screen. */
  buttonLocation?: string;
}

/**
 * Short read-only explainer shared by bottom-sheet flows so tapping an info
 * icon replaces the current sheet content instead of stacking another modal.
 */
export const PerpsInlineInfoScreen: React.FC<PerpsInlineInfoScreenProps> = ({
  contentKey,
  onBack,
  buttonLocation = PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN,
}) => {
  const { track } = usePerpsEventTracking();

  // Same interaction event the standalone tooltip sheet reports, so the A/B
  // variants stay comparable in analytics.
  const handleGotItPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.TOOLTIP,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
    });
    onBack();
  }, [buttonLocation, onBack, track]);

  const gotItButtonProps = useMemo(
    () => ({
      children: strings('perps.tooltips.got_it_button'),
      onPress: handleGotItPress,
      size: ButtonSize.Lg,
      testID: PerpsTradeSheetSelectorsIDs.INFO_GOT_IT_BUTTON,
    }),
    [handleGotItPress],
  );

  return (
    <Box accessible={false} testID={PerpsTradeSheetSelectorsIDs.INFO_SCREEN}>
      <HeaderStandard
        title={strings(`perps.tooltips.${contentKey}.title`)}
        onBack={onBack}
        backButtonProps={{
          testID: PerpsTradeSheetSelectorsIDs.INFO_BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
      />
      <Box accessible={false} paddingHorizontal={4} paddingVertical={3}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(`perps.tooltips.${contentKey}.content`)}
        </Text>
      </Box>
      <BottomSheetFooter primaryButtonProps={gotItButtonProps} />
    </Box>
  );
};
