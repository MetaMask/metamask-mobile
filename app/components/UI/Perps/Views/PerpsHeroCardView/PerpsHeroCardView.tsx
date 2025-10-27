import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text as RNText,
  ImageSourcePropType,
} from 'react-native';
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
import RewardsReferralQRCode from '../../../Rewards/components/RewardsReferralQRCode';
import {
  formatPerpsFiat,
  parseCurrencyString,
  PRICE_RANGES_MINIMAL_VIEW,
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

// To add a new card, add the image to the array.
const CARD_IMAGES: { image: ImageSourcePropType; id: number; name: string }[] =
  [
    { image: NegativePnlCharacter1, id: 0, name: 'Negative PNL Character 1' },
    { image: NegativePnlCharacter2, id: 1, name: 'Negative PNL Character 2' },
    { image: PositivePnlCharacter2, id: 2, name: 'Positive PNL Character 2' },
    { image: PositivePnlCharacter3, id: 3, name: 'Positive PNL Character 3' },
  ];

const PerpsHeroCardView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRefs = useRef<(View | null)[]>(
    Array.from({ length: CARD_IMAGES.length }, () => null),
  );
  const [currentTab, setCurrentTab] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  // Get data from route params
  const params = route.params as {
    position: Position;
    // Market price at time of closing
    marketPrice?: string;
  };
  const { position, marketPrice } = params;

  const rewardsReferralCode = useSelector(selectReferralCode);

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
        ranges: PRICE_RANGES_MINIMAL_VIEW,
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

  const { styles } = useStyles(styleSheet, { isLong: data.isLong });

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
            {rewardsReferralCode !== null && (
              <RewardsReferralCodeTag
                referralCode={rewardsReferralCode}
                backgroundColor={darkTheme.colors.background.mutedHover}
                fontColor={darkTheme.colors.accent04.light}
              />
            )}
          </View>

          {/* Asset Info Row */}
          <View style={styles.heroCardAssetRow}>
            <PerpsTokenLogo
              symbol={data.asset}
              size={14.5}
              style={styles.assetIcon}
            />
            <Text variant={TextVariant.BodySMMedium} style={styles.assetName}>
              {data.asset}
            </Text>
            <View style={styles.directionBadge}>
              <Text
                variant={TextVariant.BodyXSMedium}
                style={styles.directionBadgeText}
              >
                {directionBadgeText}
              </Text>
            </View>
          </View>

          {/* P&L Percentage */}
          <RNText
            style={[
              styles.pnlText,
              data.roe >= 0 ? styles.pnlPositive : styles.pnlNegative,
            ]}
          >
            {pnlDisplay}
          </RNText>

          {/* Price Rows Container */}
          <View style={styles.priceRowsContainer}>
            {/* Entry Price */}
            <View style={styles.priceRow}>
              <Text
                style={styles.priceLabel}
                variant={TextVariant.BodyXSMedium}
              >
                {strings('perps.pnl_hero_card.entry_price')}
              </Text>
              <Text
                style={styles.priceValue}
                variant={TextVariant.BodySMMedium}
              >
                {formatPerpsFiat(data.entryPrice, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                })}
              </Text>
            </View>

            {/* Mark Price */}
            <View style={styles.priceRow}>
              <Text
                style={styles.priceLabel}
                variant={TextVariant.BodyXSMedium}
              >
                {strings('perps.pnl_hero_card.mark_price')}
              </Text>
              <Text
                style={styles.priceValue}
                variant={TextVariant.BodySMMedium}
              >
                {data.markPrice}
              </Text>
            </View>
          </View>

          {/* Bottom Row: QR Code */}
          {rewardsReferralCode !== null && (
            <View style={styles.qrCodeContainer}>
              <RewardsReferralQRCode
                referralCode={rewardsReferralCode}
                size={100}
              />
            </View>
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
      [PerpsEventProperties.SCREEN_NAME]:
        PerpsEventValues.SCREEN_NAME.PERPS_HERO_CARD,
      [PerpsEventProperties.ACTION]: PerpsEventValues.ACTION.SHARE,
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
        track(MetaMetricsEvents.SHARE_ACTION, {
          ...sharedEventProperties,
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.INITIATED,
        });

        result = await Share.open({
          failOnCancel: false,
          url: imageUri,
          message: strings('perps.pnl_hero_card.share_message', {
            asset: data.asset,
            code: rewardsReferralCode,
            link: rewardsReferralCode
              ? buildReferralUrl(rewardsReferralCode)
              : '',
          }),
          // File mime type (required for sharing file with Instagram)
          type: 'image/png',
        });

        if (result?.success) {
          track(MetaMetricsEvents.SHARE_ACTION, {
            ...sharedEventProperties,
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.SUCCESS,
          });
          showToast(PerpsToastOptions.contentSharing.pnlHeroCard.shareSuccess);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      track(MetaMetricsEvents.SHARE_ACTION, {
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
    <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.closeButton} />
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {strings('perps.pnl_hero_card.header_title')}
        </Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <ButtonIcon
            size={ButtonIconSizes.Md}
            iconName={IconName.Close}
            iconColor={IconColor.Default}
            onPress={handleClose}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.carouselWrapper}>
        {/* Carousel */}
        {/* ScrollableTabView fills empty space by default, we need to constrain it  */}
        <View style={styles.carousel}>
          <ScrollableTabView
            renderTabBar={() => <View />}
            onChangeTab={handleTabChange}
            initialPage={0}
            prerenderingSiblingsNumber={1}
          >
            {carouselCards}
          </ScrollableTabView>
        </View>

        <View style={styles.carouselDotIndicator}>
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
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsHeroCardView;
