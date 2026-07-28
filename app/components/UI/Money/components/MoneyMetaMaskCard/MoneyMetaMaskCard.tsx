import React, { useCallback, useEffect, useRef } from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import styles from './MoneyMetaMaskCard.styles';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../Card/util/metrics';

import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import { FLAT_BANNER_ALERT_STYLE } from '../../../shared/flatBannerAlertStyle';

interface MoneyMetaMaskCardProps {
  /**
   * 'upsell' (default): virtual/metal card rows.
   * 'link': card-linking CTA layout.
   * 'manage': cardholder management layout with available balance and metal upsell.
   */
  mode?: 'upsell' | 'link' | 'manage' | 'verifying';
  onGetNowPress: () => void;
  /** Called when the "Link card" button is pressed (link mode only). */
  onLinkPress?: () => void;
  /** When true, disables the link-mode CTA. */
  isLinkDisabled?: boolean;
  /** Called when the "Manage" button is pressed (manage mode only). */
  onManagePress?: () => void;
  /**
   * Whether the user holds a Metal card. When true, link/manage layouts use the
   * Metal card image and 3% cashback copy.
   */
  showMetalCard?: boolean;
  /** User's available card balance (manage mode only). */
  cardBalance?: string;
  /** Whether the available card balance should be masked (manage mode only). */
  privacyMode?: boolean;
  /**
   * When true, the real-time balance could not be retrieved, so the available
   * balance is the last known value and is rendered muted (manage mode only).
   */
  isBalanceStale?: boolean;
  /**
   * Live vault APY used to interpolate the link-mode subtitle and the APY
   * bullet. When `undefined`, the component falls back to APY-less copy
   * (drops the APY clause from the subtitle and omits the APY bullet).
   */
  apy?: number;
  analyticsScreen?: CardScreens | string;
  analyticsEntryPoint?: CardEntryPoint;
  analyticsFlow?: string;
  analyticsCardState?: string;
  analyticsReady?: boolean;
  /**
   * Link mode only: when true, the card image is omitted and the bullets are
   * stacked vertically. Used by Card Home where the card image is already
   * shown elsewhere on the screen.
   */
  hideCardImage?: boolean;
}

const CardRow = ({
  imageSource,
  cardName,
  cashbackPercentage,
  onPress,
  testID,
}: {
  imageSource: ImageSourcePropType;
  cardName: string;
  cashbackPercentage: string;
  onPress: () => void;
  testID: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    testID={testID}
    twClassName="pt-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4"
    >
      <Image source={imageSource} style={styles.cardImage} />
      <Box twClassName="gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {cardName}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
        >
          {strings('money.metamask_card.cashback', {
            percentage: cashbackPercentage,
          })}
        </Text>
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onPress}
      twClassName="self-center"
    >
      {strings('money.metamask_card.get_now')}
    </Button>
  </Box>
);

const CheckBullet = ({ text, testID }: { text: string; testID: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="self-start gap-1"
    testID={testID}
  >
    <Icon
      name={IconName.Check}
      size={IconSize.Sm}
      color={IconColor.SuccessDefault}
    />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.SuccessDefault}
    >
      {text}
    </Text>
  </Box>
);

const LinkContent = ({
  onLinkPress,
  showMetalCard,
  apy,
  hideCardImage,
  isLinkDisabled = false,
}: {
  onLinkPress: () => void;
  showMetalCard: boolean;
  apy: number | undefined;
  hideCardImage: boolean;
  isLinkDisabled?: boolean;
}) => {
  const hasApy = apy !== undefined;
  const subtitle = hasApy
    ? strings('money.metamask_card.link_subtitle', { apy })
    : strings('money.metamask_card.link_subtitle_no_apy');
  const cashbackBullet = (
    <CheckBullet
      text={strings('money.metamask_card.link_bullet_cashback', {
        percentage: showMetalCard ? '3' : '1',
      })}
      testID={MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK}
    />
  );
  const apyBullet = hasApy ? (
    <CheckBullet
      text={strings('money.metamask_card.link_bullet_apy', { apy })}
      testID={MoneyMetaMaskCardTestIds.LINK_BULLET_APY}
    />
  ) : null;

  return (
    <Box twClassName="gap-6">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={MoneyMetaMaskCardTestIds.LINK_SUBTITLE}
      >
        {subtitle}
      </Text>
      {hideCardImage ? (
        <Box
          twClassName="gap-2"
          testID={MoneyMetaMaskCardTestIds.LINK_CONTAINER}
        >
          {cashbackBullet}
          {apyBullet}
        </Box>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4"
          testID={MoneyMetaMaskCardTestIds.LINK_CONTAINER}
        >
          <Image
            source={showMetalCard ? mmCardMetal : mmCardRegular}
            style={styles.linkCardImage}
            testID={MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE}
          />
          <Box twClassName="gap-2 flex-1 justify-center">
            {cashbackBullet}
            {apyBullet}
          </Box>
        </Box>
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={isLinkDisabled}
        onPress={onLinkPress}
        testID={MoneyMetaMaskCardTestIds.LINK_BUTTON}
        twClassName="mt-3"
      >
        {strings('money.metamask_card.link_card')}
      </Button>
    </Box>
  );
};

const ManageContent = ({
  cardBalance,
  isBalanceStale,
  onManagePress,
  showMetalCard,
  privacyMode,
}: {
  cardBalance: string;
  isBalanceStale: boolean;
  onManagePress: () => void;
  showMetalCard: boolean;
  privacyMode: boolean;
}) => (
  <Box twClassName="gap-7" testID={MoneyMetaMaskCardTestIds.MANAGE_CONTAINER}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="pt-3 gap-3"
      testID={MoneyMetaMaskCardTestIds.MANAGE_BALANCE_ROW}
    >
      <Image
        source={showMetalCard ? mmCardMetal : mmCardRegular}
        style={styles.manageCardImage}
      />
      <Box alignItems={BoxAlignItems.End} twClassName="gap-1 flex-1">
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={
            isBalanceStale ? TextColor.TextAlternative : TextColor.TextDefault
          }
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
          testID={MoneyMetaMaskCardTestIds.MANAGE_BALANCE}
        >
          {cardBalance}
        </SensitiveText>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
        >
          {strings('money.metamask_card.cashback', {
            percentage: showMetalCard ? '3' : '1',
          })}
        </Text>
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isFullWidth
      onPress={onManagePress}
      testID={MoneyMetaMaskCardTestIds.MANAGE_BUTTON}
    >
      {strings('money.metamask_card.manage_card')}
    </Button>
  </Box>
);

const MoneyMetaMaskCard = ({
  mode = 'upsell',
  onGetNowPress,
  onLinkPress,
  onManagePress,
  showMetalCard = false,
  isLinkDisabled = false,
  cardBalance,
  isBalanceStale = false,
  privacyMode = false,
  apy,
  hideCardImage = false,
  analyticsScreen,
  analyticsEntryPoint,
  analyticsFlow,
  analyticsCardState,
  analyticsReady = true,
}: MoneyMetaMaskCardProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedViewRef = useRef(false);
  const cardType = showMetalCard ? 'metal' : 'virtual';

  const buildAnalyticsProperties = useCallback(
    (action?: CardActions) => ({
      screen: analyticsScreen,
      entrypoint: analyticsEntryPoint,
      mode,
      card_type: cardType,
      flow: analyticsFlow,
      card_state: analyticsCardState,
      action,
    }),
    [
      analyticsScreen,
      analyticsEntryPoint,
      mode,
      cardType,
      analyticsFlow,
      analyticsCardState,
    ],
  );

  const trackCardButtonClick = useCallback(
    (action: CardActions) => {
      if (!analyticsScreen || !analyticsEntryPoint) return;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(buildAnalyticsProperties(action))
          .build(),
      );
    },
    [
      analyticsScreen,
      analyticsEntryPoint,
      trackEvent,
      createEventBuilder,
      buildAnalyticsProperties,
    ],
  );

  useEffect(() => {
    if (
      hasTrackedViewRef.current ||
      !analyticsReady ||
      !analyticsScreen ||
      !analyticsEntryPoint
    ) {
      return;
    }

    hasTrackedViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(buildAnalyticsProperties())
        .build(),
    );
  }, [
    analyticsReady,
    analyticsScreen,
    analyticsEntryPoint,
    trackEvent,
    createEventBuilder,
    buildAnalyticsProperties,
  ]);

  const handleLinkPress = useCallback(() => {
    trackCardButtonClick(CardActions.MONEY_ACCOUNT_METAMASK_CARD_LINK_BUTTON);
    onLinkPress?.();
  }, [trackCardButtonClick, onLinkPress]);

  const handleGetNowPress = useCallback(() => {
    trackCardButtonClick(
      CardActions.MONEY_ACCOUNT_METAMASK_CARD_GET_NOW_BUTTON,
    );
    onGetNowPress();
  }, [trackCardButtonClick, onGetNowPress]);

  const handleManagePress = useCallback(() => {
    trackCardButtonClick(CardActions.MONEY_ACCOUNT_METAMASK_CARD_MANAGE_BUTTON);
    onManagePress?.();
  }, [trackCardButtonClick, onManagePress]);

  let content: React.ReactNode = null;
  if (mode === 'link') {
    content = (
      <LinkContent
        onLinkPress={handleLinkPress}
        showMetalCard={showMetalCard}
        apy={apy}
        hideCardImage={hideCardImage}
        isLinkDisabled={isLinkDisabled}
      />
    );
  } else if (mode === 'manage') {
    content = (
      <ManageContent
        cardBalance={cardBalance ?? ''}
        isBalanceStale={isBalanceStale}
        onManagePress={handleManagePress}
        showMetalCard={showMetalCard}
        privacyMode={privacyMode}
      />
    );
  } else if (mode === 'verifying') {
    content = (
      <Box twClassName="pt-3">
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={strings('money.metamask_card.verification_pending')}
          descriptionProps={{ fontWeight: FontWeight.Medium }}
          style={FLAT_BANNER_ALERT_STYLE}
          testID={MoneyMetaMaskCardTestIds.VERIFYING_BANNER}
        />
      </Box>
    );
  } else {
    content = (
      <>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('money.metamask_card.subtitle')}
        </Text>
        <CardRow
          imageSource={mmCardRegular}
          cardName={strings('money.metamask_card.virtual_card')}
          cashbackPercentage="1"
          onPress={handleGetNowPress}
          testID={MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW}
        />
      </>
    );
  }

  let headerTitleKey: string;
  if (mode === 'link') {
    headerTitleKey = 'money.metamask_card.link_title';
  } else if (mode === 'manage' || mode === 'verifying') {
    headerTitleKey = 'money.metamask_card.title';
  } else {
    headerTitleKey = 'money.metamask_card.upsell_title';
  }

  return (
    <Box
      twClassName="px-4 py-3 gap-3"
      testID={MoneyMetaMaskCardTestIds.CONTAINER}
    >
      <MoneySectionHeader title={strings(headerTitleKey)} />
      {content}
    </Box>
  );
};

export default MoneyMetaMaskCard;
