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
import {
  CommonActions,
  NavigationContext,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import PayWithSection from '../../../../Views/confirmations/components/UI/pay-with-section';
import { useDismissOnPaymentChange } from '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange';
import { usePayWithSections } from '../../../../Views/confirmations/hooks/pay/usePayWithSections';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import { hasPerpsPaymentTokenSelection } from '../../utils/perpsPaymentTokenSelection';
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

/**
 * Navigation the shared pay-with sections see while rendered inside the Trade
 * sheet. Their `goBack` returns to the trade screen instead of popping the
 * confirmation route, and "Other assets" only pops the token list it pushes,
 * because the picker itself is not a route.
 */
type PayWithNavigationCall = (routeName: string, params?: object) => void;

export function createInlinePayWithNavigation(
  navigation: AppNavigationProp,
  dismiss: () => void,
): AppNavigationProp {
  const navigate: PayWithNavigationCall = (routeName, params) => {
    navigation.dispatch(
      CommonActions.navigate(
        routeName,
        routeName === Routes.CONFIRMATION_PAY_WITH_MODAL
          ? { ...params, dismissOnSelectCount: 1 }
          : params,
      ),
    );
  };

  return Object.assign({}, navigation, {
    goBack: dismiss,
    navigate,
  }) as AppNavigationProp;
}

/**
 * Section list of the pay-with picker. Rendered below the inline navigation
 * override so the section hooks return to the trade screen instead of popping
 * the confirmation route.
 */
const PerpsTradePayWithSections: React.FC = () => {
  const { sections } = usePayWithSections();
  // Same behaviour as the standalone pay-with sheet: the pay token may still
  // be hydrating when the picker opens, so only fiat changes auto-dismiss.
  useDismissOnPaymentChange({ dismissOnPayTokenChange: false });

  return (
    <ScrollView
      testID={`${PerpsTradeSheetSelectorsIDs.PAY_WITH_SCREEN}-scroll`}
    >
      {sections.map((section) => (
        <PayWithSection key={section.id} config={section} />
      ))}
    </ScrollView>
  );
};

interface PerpsTradePayWithScreenProps {
  /**
   * Called whenever the picker is left: back button, a row selection, or a
   * selection made in the nested "Other assets" token list.
   */
  onDismiss?: () => void;
}

/**
 * Pay-with token picker shown inline in the Trade sheet so choosing a payment
 * token does not stack another bottom sheet on top of the trade form.
 */
export const PerpsTradePayWithScreen: React.FC<
  PerpsTradePayWithScreenProps
> = ({ onDismiss }) => {
  const { goBack } = usePerpsTradeSheet();
  const navigation = useNavigation<AppNavigationProp>();
  const hasReportedDismissRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const reportDismiss = useCallback(() => {
    if (hasReportedDismissRef.current) {
      return;
    }
    hasReportedDismissRef.current = true;
    onDismissRef.current?.();
  }, []);

  const handleDismiss = useCallback(() => {
    reportDismiss();
    goBack();
  }, [goBack, reportDismiss]);

  // Hardware back (and closing the whole sheet) leave this screen without
  // going through `handleDismiss`; still report the picker being left.
  useEffect(() => reportDismiss, [reportDismiss]);

  // "Other assets" pushes the full token list as its own route. When that
  // route pops after an explicit selection, leave the picker as well; a plain
  // dismissal of the token list returns here.
  const hasBlurredRef = useRef(false);
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      hasBlurredRef.current = true;
    });
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!hasBlurredRef.current) {
        return;
      }
      hasBlurredRef.current = false;
      if (hasPerpsPaymentTokenSelection()) {
        handleDismiss();
      }
    });

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [handleDismiss, navigation]);

  const inlineNavigation = useMemo(
    () => createInlinePayWithNavigation(navigation, handleDismiss),
    [handleDismiss, navigation],
  );

  return (
    <NavigationContext.Provider
      value={
        inlineNavigation as unknown as React.ComponentProps<
          typeof NavigationContext.Provider
        >['value']
      }
    >
      <Box
        accessible={false}
        testID={PerpsTradeSheetSelectorsIDs.PAY_WITH_SCREEN}
      >
        <HeaderStandard
          title={strings('confirm.pay_with_bottom_sheet.title')}
          onBack={handleDismiss}
          backButtonProps={{
            testID: PerpsTradeSheetSelectorsIDs.PAY_WITH_BACK_BUTTON,
            accessibilityLabel: strings('navigation.back'),
          }}
        />
        <PerpsTradePayWithSections />
      </Box>
    </NavigationContext.Provider>
  );
};
