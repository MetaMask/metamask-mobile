import React, { useRef, useMemo, useState, useCallback } from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { useSelector } from 'react-redux';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../../../component-library/hooks';
import { selectReferralCode } from '../../../../../reducers/rewards/selectors';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import RewardsReferralCodeTag from '../../../Rewards/components/RewardsReferralCodeTag';
import {
  formatPerpsFiat,
  parseCurrencyString,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import MetaMaskLogo from '../../../../../images/branding/metamask-name.png';
import NegativePnlCharacter1 from '../../../../../images/negative_pnl_character_1_3x.png';
import NegativePnlCharacter2 from '../../../../../images/negative_pnl_character_2_3x.png';
import PositivePnlCharacter2 from '../../../../../images/positive_pnl_character_2_3x.png';
import PositivePnlCharacter3 from '../../../../../images/positive_pnl_character_3_3x.png';
import type { Position } from '../../controllers/types';
import { darkTheme } from '@metamask/design-tokens';
import styleSheet from './PerpsHeroCardView.styles';
import Logger from '../../../../../util/Logger';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { buildReferralUrl } from '../../../Rewards/utils';
import { usePerpsToasts } from '../../hooks';
import { ShareOpenResult } from 'react-native-share/lib/typescript/types';
import {
  PerpsHeroCardViewSelectorsIDs,
  getPerpsHeroCardViewSelector,
} from '../../Perps.testIds';
import { useReferralDetails } from '../../../Rewards/hooks/useReferralDetails';
import { useSeasonStatus } from '../../../Rewards/hooks/useSeasonStatus';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';

// To add a new card, add the image to the array.
const CARD_IMAGES: { image: ImageSourcePropType; id: number; name: string }[] =
  [
    { image: PositivePnlCharacter2, id: 0, name: 'Positive PNL Character 2' },
    { image: NegativePnlCharacter1, id: 1, name: 'Negative PNL Character 1' },
    { image: PositivePnlCharacter3, id: 2, name: 'Positive PNL Character 3' },
    { image: NegativePnlCharacter2, id: 3, name: 'Negative PNL Character 2' },
  ];

const PerpsHeroCardView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRefs = useRef<(View | null)[]>(
    Array.from({ length: CARD_IMAGES.length }, () => null),
  );
  const [currentTab, setCurrentTab] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const params = route.params as {
    position: Position;
    marketPrice?: string;
    source?: string;
  };
  const { position, marketPrice, source } = params;

  const rewardsReferralCode = useSelector(selectReferralCode);

  // Fetch season status to populate seasonId (required by useReferralDetails)
  useSeasonStatus({ onlyForExplicitFetch: false });

  // Fetch referral details to ensure code is available for display
  useReferralDetails();

  const { track } = usePerpsEventTracking();

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const data = useMemo(() => {
    const isLong = Number.parseFloat(position.size) >= 0;
    const direction = isLong ? 'long' : 'short';
    const pnlValue = Number.parseFloat(position.unrealizedPnl);
    const roeValue = Number.parseFloat(position.returnOnEquity || '0') * 100;
    const entryPrice = position.entryPrice;

    const marketPriceParsed = parseCurrencyString(marketPrice ?? '');

    return {
      asset: position.coin,
      direction,
      leverage: position.leverage.value,
      pnl: pnlValue,
      roe: roeValue,
      entryPrice,
      markPrice: formatPerpsFiat(marketPriceParsed ?? '', {
        ranges: PRICE_RANGES_UNIVERSAL,
      }),
      isLong,
    };
  }, [
    position.size,
    position.unrealizedPnl,
    position.returnOnEquity,
    position.entryPrice,
    position.coin,
    position.leverage.value,
    marketPrice,
  ]);

  const handleTabChange = useCallback((obj: { i: number }) => {
    setCurrentTab(obj.i);
  }, []);

  // Track PnL hero card screen viewed
  // Determine entry point: asset_screen or close_toast
  const entryPoint =
    source === PerpsEventValues.SOURCE.CLOSE_TOAST
      ? PerpsEventValues.SOURCE.CLOSE_TOAST
      : PerpsEventValues.SOURCE.PERP_ASSET_SCREEN;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.PNL_HERO_CARD,
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.DIRECTION]:
        data.direction === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.SOURCE]: entryPoint,
      [PerpsEventProperties.PNL_DOLLAR]: data.pnl,
      [PerpsEventProperties.PNL_PERCENT]: data.roe,
    },
  });

  // Track DISPLAY_HERO_CARD UI interaction (spec requirement)
  // Source indicates where user tapped to display the card: open_position or position_close_toast
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
    properties: {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.DISPLAY_HERO_CARD,
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.DIRECTION]:
        data.direction === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.SOURCE]: entryPoint,
      [PerpsEventProperties.PNL_DOLLAR]: data.pnl,
      [PerpsEventProperties.PNL_PERCENT]: data.roe,
    },
  });

  const { styles } = useStyles(styleSheet, {
    isLong: data.isLong,
    hasReferralCode: Boolean(rewardsReferralCode),
  });

  const handleClose = () => {
    navigation.goBack();
  };

  const pnlSign = data.pnl >= 0 ? '+' : '';
  const pnlDisplay = `${pnlSign}${data.roe.toFixed(1)}%`;
  const directionText =
    data.direction.charAt(0).toUpperCase() + data.direction.slice(1);
  const directionBadgeText = data.leverage
    ? `${directionText} ${data.leverage}x`
    : directionText;

  const carouselCards = useMemo(
    () =>
      CARD_IMAGES.map(({ image, id: imageId }, index) => (
        <View
          key={imageId}
          ref={(ref) => {
            viewShotRefs.current[index] = ref;
          }}
          style={styles.cardContainer}
          testID={getPerpsHeroCardViewSelector.cardContainer(index)}
        >
          {/* Background Image */}
          <Image
            source={image}
            style={styles.backgroundImage}
            resizeMode="contain"
          />

          {/* Top Row: Logo + Referral Tag */}
          <View style={styles.heroCardTopRow}>
            <Image
              source={MetaMaskLogo}
              style={styles.metamaskLogo}
              resizeMode="contain"
            />
          </View>

          {/* Asset Info Row */}
          <View style={styles.heroCardAssetRow}>
            <PerpsTokenLogo
              symbol={data.asset}
              size={14.5}
              style={styles.assetIcon}
            />
            <Text
              variant={TextVariant.BodySMMedium}
              style={styles.assetName}
              testID={getPerpsHeroCardViewSelector.assetSymbol(index)}
            >
              {getPerpsDisplaySymbol(data.asset)}
            </Text>
            <View
              style={styles.directionBadge}
              testID={getPerpsHeroCardViewSelector.directionBadge(index)}
            >
              <Text
                variant={TextVariant.BodyXSMedium}
                style={styles.directionBadgeText}
                testID={getPerpsHeroCardViewSelector.directionBadgeText(index)}
              >
                {directionBadgeText}
              </Text>
            </View>
          </View>

          <View
            style={
              rewardsReferralCode
                ? undefined
                : styles.referralCodeContentContainer
            }
          >
            {/* P&L Percentage */}
            <Text
              variant={TextVariant.DisplayLG}
              style={data.roe >= 0 ? styles.pnlPositive : styles.pnlNegative}
              testID={getPerpsHeroCardViewSelector.pnlText(index)}
            >
              {pnlDisplay}
            </Text>

            {/* Price Rows Container */}
            <View style={styles.priceRowsContainer}>
              {/* Entry Price */}
              <View style={styles.priceRow}>
                <View style={styles.priceLabelContainer}>
                  <Text
                    style={styles.priceLabel}
                    variant={TextVariant.BodySMMedium}
                  >
                    {/* Intentionally not using i18n string */}
                    Entry
                  </Text>
                </View>
                <Text
                  style={styles.priceValue}
                  variant={TextVariant.BodySMMedium}
                >
                  {formatPerpsFiat(data.entryPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })}
                </Text>
              </View>

              {/* Mark Price */}
              <View style={styles.priceRow}>
                <View style={styles.priceLabelContainer}>
                  <Text
                    style={styles.priceLabel}
                    variant={TextVariant.BodySMMedium}
                  >
                    {/* Intentionally not using i18n  */}
                    Mark
                  </Text>
                </View>

                <Text
                  style={styles.priceValue}
                  variant={TextVariant.BodySMMedium}
                >
                  {data.markPrice}
                </Text>
              </View>
            </View>
          </View>

          {rewardsReferralCode && (
            <>
              <View
                style={styles.referralCodeTagContainer}
                testID={getPerpsHeroCardViewSelector.referralCodeTag(index)}
              >
                <RewardsReferralCodeTag
                  referralCode={rewardsReferralCode}
                  backgroundColor={darkTheme.colors.background.mutedHover}
                  fontColor={darkTheme.colors.accent04.light}
                />
              </View>
              <Text
                variant={TextVariant.BodyXS}
                style={styles.referralCodeText}
              >
                {strings('perps.pnl_hero_card.referral_code_text')}
              </Text>
            </>
          )}
        </View>
      )),
    [
      styles,
      rewardsReferralCode,
      data.asset,
      data.roe,
      data.entryPrice,
      data.markPrice,
      directionBadgeText,
      pnlDisplay,
    ],
  );

  const captureCard = async (): Promise<string | null> => {
    try {
      const currentRef = viewShotRefs.current[currentTab];
      if (currentRef) {
        const uri = await captureRef(currentRef, {
          format: 'png',
          quality: 1,
        });
        return uri;
      }
      return null;
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Error capturing Perps Hero Card',
        context: 'PerpsHeroCardView.captureCard',
      });
      return null;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const imageSelected = CARD_IMAGES[currentTab].name;

    const sharedEventProperties = {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.SHARE_PNL_HERO_CARD,
      [PerpsEventProperties.SCREEN_NAME]:
        PerpsEventValues.SCREEN_NAME.PERPS_HERO_CARD,
      [PerpsEventProperties.ASSET]: data.asset,
      [PerpsEventProperties.DIRECTION]: data.direction,
      [PerpsEventProperties.LEVERAGE]: data.leverage,
      [PerpsEventProperties.PNL_PERCENT]: pnlDisplay,
      [PerpsEventProperties.IMAGE_SELECTED]: imageSelected,
      [PerpsEventProperties.TAB_NUMBER]: currentTab,
    };

    let result: ShareOpenResult | null = null;

    try {
      const imageUri = await captureCard();
      if (imageUri) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          ...sharedEventProperties,
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.INITIATED,
        });

        const message = rewardsReferralCode
          ? strings('perps.pnl_hero_card.share_message_with_referral_code', {
              asset: data.asset,
              code: rewardsReferralCode,
              link: buildReferralUrl(rewardsReferralCode),
            })
          : strings('perps.pnl_hero_card.share_message_without_referral_code', {
              asset: data.asset,
            });

        result = await Share.open({
          failOnCancel: false,
          url: imageUri,
          message,
          // File mime type (required for sharing file with Instagram)
          type: 'image/png',
        });

        if (result?.success) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            ...sharedEventProperties,
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.SUCCESS,
          });
          showToast(PerpsToastOptions.contentSharing.pnlHeroCard.shareSuccess);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        ...sharedEventProperties,
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
      });

      // Don't show error toast if user dismissed the share dialog
      if (!result?.success && !result?.dismissedAction) {
        showToast(PerpsToastOptions.contentSharing.pnlHeroCard.shareFailed);
      }

      Logger.error(error as Error, {
        message: 'Error sharing Perps Hero Card',
        context: 'PerpsHeroCardView.handleShare',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeAreaContainer}
      edges={['top', 'bottom']}
      testID={PerpsHeroCardViewSelectorsIDs.CONTAINER}
    >
      {/* Header */}
      <View style={styles.header} testID={PerpsHeroCardViewSelectorsIDs.HEADER}>
        <View style={styles.closeButton} />
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.headerTitle}
          testID={PerpsHeroCardViewSelectorsIDs.HEADER_TITLE}
        >
          {strings('perps.pnl_hero_card.header_title')}
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          testID={PerpsHeroCardViewSelectorsIDs.CLOSE_BUTTON}
        >
          <ButtonIcon
            size={ButtonIconSizes.Md}
            iconName={IconName.Close}
            iconColor={IconColor.Default}
            onPress={handleClose}
          />
        </TouchableOpacity>
      </View>

      <View
        style={styles.carouselWrapper}
        testID={PerpsHeroCardViewSelectorsIDs.CAROUSEL_WRAPPER}
      >
        {/* Carousel */}
        {/* ScrollableTabView fills empty space by default, we need to constrain it  */}
        <View
          style={styles.carousel}
          testID={PerpsHeroCardViewSelectorsIDs.CAROUSEL}
        >
          <ScrollableTabView
            renderTabBar={() => <View />}
            onChangeTab={handleTabChange}
            initialPage={0}
            prerenderingSiblingsNumber={1}
          >
            {carouselCards}
          </ScrollableTabView>
        </View>

        <View
          style={styles.carouselDotIndicator}
          testID={PerpsHeroCardViewSelectorsIDs.DOT_INDICATOR}
        >
          {CARD_IMAGES.map(({ id: imageId }, dotIndex) => (
            <View
              key={imageId}
              style={[
                styles.progressDot,
                currentTab === dotIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Footer Button */}
      <View style={styles.footerButtonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.pnl_hero_card.share_button')}
          startIconName={isSharing ? undefined : IconName.Share}
          onPress={handleShare}
          loading={isSharing}
          isDisabled={isSharing}
          testID={PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON}
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsHeroCardView;
