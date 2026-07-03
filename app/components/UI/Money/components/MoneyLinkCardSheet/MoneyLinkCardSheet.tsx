import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
} from '../../../../../selectors/cardController';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { CardType } from '../../../Card/types';
import AnimatedMoneyCard from '../AnimatedMoneyCard';
import styleSheet from './MoneyLinkCardSheet.styles';
import { MoneyLinkCardSheetTestIds } from './MoneyLinkCardSheet.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../Card/util/metrics';

interface MoneyLinkCardSheetRouteParams {
  entrypoint?: CardEntryPoint | string;
}

/**
 * "Spend and earn" confirmation bottom sheet shown before the Money Account ↔
 * Card linkage runs. The sheet is opened by
 * `useMoneyAccountCardLinkage.openLinkCardSheet`; pressing the primary CTA
 * dismisses the sheet immediately and dispatches
 * `confirmLinkInBackground`, which owns the pending / success / error /
 * cancel toast UX (Predict-style spinner). Dismissing via the header X (or
 * gesture / overlay tap) does nothing on-chain.
 */
const MoneyLinkCardSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasTrackedViewRef = useRef(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { styles } = useStyles(styleSheet, {});
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage();
  const { apyPercent } = useMoneyAccountBalance();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const cardHomeData = useSelector(selectCardHomeData);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const surfaceClass = useElevatedSurface();
  const isMetalCard = cardHomeData?.card?.type === CardType.METAL;
  const routeParams = route.params as MoneyLinkCardSheetRouteParams | undefined;
  const originEntryPoint =
    routeParams?.entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET;
  const cardType = isMetalCard ? 'metal' : 'virtual';
  const isCardDataReady =
    cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error';

  useEffect(() => {
    if (hasTrackedViewRef.current || !isCardDataReady) return;
    hasTrackedViewRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.MONEY_LINK_CARD_SHEET,
          entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          origin_entrypoint: originEntryPoint,
          card_type: cardType,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    originEntryPoint,
    cardType,
    isCardDataReady,
  ]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          screen: CardScreens.MONEY_LINK_CARD_SHEET,
          entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          origin_entrypoint: originEntryPoint,
          action: CardActions.MONEY_LINK_CARD_SHEET_CLOSE_BUTTON,
          card_type: cardType,
        })
        .build(),
    );

    sheetRef.current?.onCloseBottomSheet();
  }, [trackEvent, createEventBuilder, originEntryPoint, cardType]);

  const handleConfirm = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          screen: CardScreens.MONEY_LINK_CARD_SHEET,
          entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          origin_entrypoint: originEntryPoint,
          action: CardActions.MONEY_LINK_CARD_SHEET_CONFIRM_BUTTON,
          card_type: cardType,
        })
        .build(),
    );

    sheetRef.current?.onCloseBottomSheet(() => {
      confirmLinkInBackground({ entrypoint: originEntryPoint }).catch(
        () => undefined,
      );
    });
  }, [
    trackEvent,
    createEventBuilder,
    originEntryPoint,
    cardType,
    confirmLinkInBackground,
  ]);

  const description: React.ReactNode =
    apyPercent === undefined ? (
      strings('money.metamask_card.link_card_sheet_description_no_apy')
    ) : (
      <>
        {strings('money.metamask_card.link_card_sheet_description_prefix')}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
        >
          {' '}
          {strings('money.apy_label', { percentage: apyPercent })}
        </Text>
        {strings('money.metamask_card.link_card_sheet_description_suffix')}
      </>
    );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyLinkCardSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: MoneyLinkCardSheetTestIds.CLOSE_BUTTON }}
      />
      <Box twClassName="px-4 pb-2 gap-4 items-center">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <AnimatedMoneyCard
            cardType={isMetalCard ? 'metal' : 'virtual'}
            style={styles.cardImage}
            testID={MoneyLinkCardSheetTestIds.ILLUSTRATION}
          />
        </Box>
        <Box twClassName="gap-2 items-center">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-center"
            testID={MoneyLinkCardSheetTestIds.TITLE}
          >
            {strings('money.metamask_card.link_card_sheet_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={MoneyLinkCardSheetTestIds.DESCRIPTION}
          >
            {description}
          </Text>
        </Box>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('money.metamask_card.link_card_sheet_cta'),
          onPress: handleConfirm,
          testID: MoneyLinkCardSheetTestIds.CTA_BUTTON,
        }}
        twClassName="px-4 pt-4 pb-6"
      />
    </BottomSheet>
  );
};

export default MoneyLinkCardSheet;
