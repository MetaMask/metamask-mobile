import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { type OrderType } from '@metamask/perps-controller';
import {
  CommonActions,
  NavigationContext,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import PayWithSection from '../../../../Views/confirmations/components/UI/pay-with-section';
import { useDismissOnPaymentChange } from '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange';
import { usePayWithSections } from '../../../../Views/confirmations/hooks/pay/usePayWithSections';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import { hasPerpsPaymentTokenSelection } from '../../utils/perpsPaymentTokenSelection';
import {
  PerpsInlineInfoScreen,
  type PerpsInlineInfoContentKey,
} from '../PerpsInlineInfoScreen/PerpsInlineInfoScreen';
import PerpsLeverageBottomSheet from '../PerpsLeverageBottomSheet';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';
export { default as PerpsTradeTPSLScreen } from './PerpsTradeTPSLScreen';
export { PerpsInlineInfoScreen, type PerpsInlineInfoContentKey };

interface PerpsTradeLeverageScreenProps {
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number | undefined;
  direction: 'long' | 'short';
  asset: string;
  limitPrice?: string;
  orderType: OrderType;
}

export const PerpsTradeLeverageScreen: React.FC<
  PerpsTradeLeverageScreenProps
> = ({ onConfirm, ...props }) => {
  const { close, goBack } = usePerpsTradeSheet();
  const { fireImpact } = useHaptics();

  const handleConfirm = useCallback(
    (leverage: number, inputMethod?: 'slider' | 'preset') => {
      fireImpact(ImpactMoment.PrimaryCTA);
      onConfirm(leverage, inputMethod);
    },
    [onConfirm, fireImpact],
  );

  return (
    <PerpsLeverageBottomSheet
      {...props}
      onConfirm={handleConfirm}
      isVisible
      presentation="screen"
      onBack={goBack}
      onClose={close}
      onConfirmComplete={goBack}
    />
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
  // The token list pops itself before its close callback marks the selection,
  // so the marker is not visible until this focus turn finishes.
  const hasBlurredRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const unsubscribeBlur = navigation.addListener('blur', () => {
      hasBlurredRef.current = true;
    });
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!hasBlurredRef.current) {
        return;
      }
      hasBlurredRef.current = false;
      queueMicrotask(() => {
        if (cancelled || !hasPerpsPaymentTokenSelection()) {
          return;
        }
        handleDismiss();
      });
    });

    return () => {
      cancelled = true;
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
