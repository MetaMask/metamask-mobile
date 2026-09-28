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
  type OrderType,
} from '@metamask/perps-controller';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsLeverageBottomSheet from '../PerpsLeverageBottomSheet';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';
export { default as PerpsTradeTPSLScreen } from './PerpsTradeTPSLScreen';

interface PerpsTradeLeverageScreenProps {
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  direction: 'long' | 'short';
  asset: string;
  limitPrice?: string;
  orderType: OrderType;
}

export const PerpsTradeLeverageScreen: React.FC<
  PerpsTradeLeverageScreenProps
> = (props) => {
  const { close, goBack } = usePerpsTradeSheet();
  return (
    <PerpsLeverageBottomSheet
      {...props}
      isVisible
      presentation="screen"
      onBack={goBack}
      onClose={close}
      onConfirmComplete={goBack}
    />
  );
};

/** Explainers that the Trade sheet shows inline instead of in a new sheet. */
export type PerpsInlineInfoContentKey =
  | 'margin'
  | 'liquidation_price'
  | 'liquidation_distance';

interface PerpsInlineInfoScreenProps {
  contentKey: PerpsInlineInfoContentKey;
  onBack: () => void;
}

/**
 * Short read-only explainer shared by bottom-sheet flows so tapping an info
 * icon replaces the current sheet content instead of stacking another modal.
 */
export const PerpsInlineInfoScreen: React.FC<PerpsInlineInfoScreenProps> = ({
  contentKey,
  onBack,
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
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN,
    });
    onBack();
  }, [onBack, track]);

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

interface PerpsTradeInfoScreenProps {
  contentKey: PerpsInlineInfoContentKey;
}

export const PerpsTradeInfoScreen: React.FC<PerpsTradeInfoScreenProps> = (
  props,
) => {
  const { goBack } = usePerpsTradeSheet();

  return <PerpsInlineInfoScreen {...props} onBack={goBack} />;
};
