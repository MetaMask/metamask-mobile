import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
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
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardActiveProviderId,
} from '../../../../../selectors/cardController';
import Engine from '../../../../../core/Engine';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { CardType } from '../../../Card/types';
import MoneyCardFlipAnimation from '../MoneyCardFlipAnimation';
import MoneySheetEntrance from '../MoneySheetEntrance';
import {
  MoneySheetEntranceStep,
  moneySheetEntranceDelay,
} from '../../constants/sheetEntrance';
import { MoneyLinkCardSheetTestIds } from './MoneyLinkCardSheet.testIds';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
  withCardProvider,
} from '../../../Card/util/metrics';

interface MoneyLinkCardSheetRouteParams {
  entrypoint?: CardEntryPoint | string;
}

/**
 * Beat held between the sheet finishing its open slide and the card flip
 * starting. `onOpen` fires the moment the slide's animated value lands, which
 * can still be a frame or two short of being on screen, and two motions run
 * back to back read as one rushed event rather than a sequence.
 */
const CARD_ANIMATION_START_DELAY_MS = 90;

// The entrance wrapper shrink-wraps under the parent's `items-center`, which
// would narrow the wrap width of the centred copy.
const fullWidthStyle: ViewStyle = { width: '100%' };

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
  const startDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasSheetOpened, setHasSheetOpened] = useState(false);
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage();
  const { apyPercent } = useMoneyVaultApy();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const cardHomeData = useSelector(selectCardHomeData);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const isMetalCard = cardHomeData?.card?.type === CardType.METAL;
  const routeParams = route.params as MoneyLinkCardSheetRouteParams | undefined;
  const originEntryPoint =
    routeParams?.entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET;
  const cardType = isMetalCard ? 'metal' : 'virtual';
  const isCardDataReady =
    cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error';

  useEffect(() => {
    if (cardHomeDataStatus === 'idle') {
      Engine.context.CardController.fetchCardHomeData();
    }
  }, [cardHomeDataStatus]);

  useEffect(() => {
    if (hasTrackedViewRef.current || !isCardDataReady) return;
    hasTrackedViewRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.MONEY_LINK_CARD_SHEET,
            entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            origin_entrypoint: originEntryPoint,
            card_type: cardType,
          }),
        )
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    activeProviderId,
    originEntryPoint,
    cardType,
    isCardDataReady,
  ]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Fires once the sheet's own open transition has finished, so the card
  // animation is sequenced after it rather than running against it. The extra
  // beat keeps the two motions from reading as one.
  const handleOpen = useCallback(() => {
    startDelayRef.current = setTimeout(
      () => setHasSheetOpened(true),
      CARD_ANIMATION_START_DELAY_MS,
    );
  }, []);

  useEffect(
    () => () => {
      if (startDelayRef.current) clearTimeout(startDelayRef.current);
    },
    [],
  );

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.MONEY_LINK_CARD_SHEET,
            entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            origin_entrypoint: originEntryPoint,
            action: CardActions.MONEY_LINK_CARD_SHEET_CLOSE_BUTTON,
            card_type: cardType,
          }),
        )
        .build(),
    );

    sheetRef.current?.onCloseBottomSheet();
  }, [
    trackEvent,
    createEventBuilder,
    activeProviderId,
    originEntryPoint,
    cardType,
  ]);

  const handleConfirm = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: CardScreens.MONEY_LINK_CARD_SHEET,
            entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            origin_entrypoint: originEntryPoint,
            action: CardActions.MONEY_LINK_CARD_SHEET_CONFIRM_BUTTON,
            card_type: cardType,
          }),
        )
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
    activeProviderId,
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
      onOpen={handleOpen}
      testID={MoneyLinkCardSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: MoneyLinkCardSheetTestIds.CLOSE_BUTTON }}
      />
      <Box twClassName="px-4 pb-2 gap-4 items-center">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          testID={MoneyLinkCardSheetTestIds.ILLUSTRATION}
        >
          <MoneyCardFlipAnimation
            isMetalCard={isCardDataReady ? isMetalCard : undefined}
            shouldPlay={hasSheetOpened}
          />
        </Box>
        <Box twClassName="gap-2 items-center">
          <MoneySheetEntrance
            isActive={hasSheetOpened}
            delayMs={moneySheetEntranceDelay(MoneySheetEntranceStep.Title)}
            style={fullWidthStyle}
          >
            <Text
              variant={TextVariant.HeadingLg}
              twClassName="text-center"
              testID={MoneyLinkCardSheetTestIds.TITLE}
            >
              {strings('money.metamask_card.link_card_sheet_title')}
            </Text>
          </MoneySheetEntrance>
          <MoneySheetEntrance
            isActive={hasSheetOpened}
            delayMs={moneySheetEntranceDelay(
              MoneySheetEntranceStep.Description,
            )}
            style={fullWidthStyle}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
              testID={MoneyLinkCardSheetTestIds.DESCRIPTION}
            >
              {description}
            </Text>
          </MoneySheetEntrance>
        </Box>
      </Box>
      <MoneySheetEntrance
        isActive={hasSheetOpened}
        delayMs={moneySheetEntranceDelay(MoneySheetEntranceStep.Footer)}
      >
        <BottomSheetFooter
          primaryButtonProps={{
            size: ButtonSize.Lg,
            children: strings('money.metamask_card.link_card_sheet_cta'),
            onPress: handleConfirm,
            testID: MoneyLinkCardSheetTestIds.CTA_BUTTON,
          }}
          twClassName="px-4 pt-4 pb-6"
        />
      </MoneySheetEntrance>
    </BottomSheet>
  );
};

export default MoneyLinkCardSheet;
