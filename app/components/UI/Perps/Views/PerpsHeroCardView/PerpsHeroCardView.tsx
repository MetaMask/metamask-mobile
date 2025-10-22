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
import { usePerpsMarkets } from '../../hooks';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  parseCurrencyString,
} from '../../utils/formatUtils';
import MetaMaskLogo from '../../../../../images/branding/metamask-name.png';
import NegativePnlCharacter1 from '../../../../../images/negative_pnl_character_1_3x.png';
import styleSheet from './PerpsHeroCardView.styles';
import type { Position } from '../../controllers/types';
import type { PerpsTransaction } from '../../types/transactionHistory';
import { ImageBackground } from 'expo-image';

const CARD_IMAGES = {
  NEGATIVE_PNL_CHARACTER_1: NegativePnlCharacter1,
};

// TODO: Use live position data from websocket instead of polling or using route params.
const PerpsHeroCardView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRefs = useRef<(View | null)[]>([null, null, null]);
  const [currentTab, setCurrentTab] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [backgroundImage, setBackgroundImage] =
    useState<ImageSourcePropType | null>(CARD_IMAGES.NEGATIVE_PNL_CHARACTER_1);

  // Get data from route params
  const params = route.params as {
    position?: Position;
    transaction?: PerpsTransaction;
  };
  const { position, transaction } = params;

  const rewardsReferralCode = useSelector(selectReferralCode);

  // Get markets data to fetch current market price
  const { markets } = usePerpsMarkets({
    enablePolling: true,
    // We want to keep the mark price up to date while the user selects an image.
    pollingInterval: 1 * 60 * 1000,
  });

  // Extract data from position or transaction
  const data = useMemo(() => {
    if (position) {
      const isLong = Number.parseFloat(position.size) >= 0;
      const direction = isLong ? 'long' : 'short';
      const pnlValue = Number.parseFloat(position.unrealizedPnl);
      const roeValue = Number.parseFloat(position.returnOnEquity || '0') * 100;
      const entryPrice = position.entryPrice;

      // Find current market price
      const market = markets.find((m) => m.symbol === position.coin);
      let markPrice = null;

      if (market?.price) {
        markPrice = parseCurrencyString(market.price).toString();
      }

      return {
        asset: position.coin,
        direction,
        leverage: position.leverage.value,
        pnl: pnlValue,
        roe: roeValue,
        entryPrice,
        markPrice,
        isLong,
      };
    }

    // TODO: Fix incomplete data when navigating from transaction screen.
    // TODO: Update CLOSE_POSITION toast to include "Share P&L" button.
    if (transaction?.fill) {
      const { fill } = transaction;
      // Determine direction from transaction
      const isLong = fill.shortTitle?.toLowerCase().includes('long') ?? true;
      const direction = isLong ? 'long' : 'short';
      const pnlValue = Number.parseFloat(fill.pnl || '0');
      // Calculate ROE from P&L if available
      const roeValue = fill.amountNumber
        ? (pnlValue / Math.abs(fill.amountNumber)) * 100
        : 0;

      // Extract asset from transaction asset field (format: "xyz:XYZ100")
      const asset = transaction.asset?.split(':')[1] || 'UNKNOWN';

      // Find current market price
      const market = markets.find((m) => m.symbol === asset);
      let markPrice = null;
      if (market?.price) {
        markPrice = parseCurrencyString(market.price).toString();
      }

      return {
        asset,
        direction,
        // TODO: FIXME - Try to get leverage another way
        leverage: 40, // Default leverage, not available in transaction
        pnl: pnlValue,
        roe: roeValue,
        entryPrice: fill.entryPrice || '0',
        markPrice,
        isLong,
      };
    }

    return null;
  }, [position, transaction, markets]);

  const handleTabChange = useCallback((obj: { i: number }) => {
    setCurrentTab(obj.i);
  }, []);

  const { styles } = useStyles(styleSheet, { isLong: Boolean(data?.isLong) });

  // TODO: Handle graceful failure. We don't want fallback data since it won't be accurate.
  if (!data) {
    return null;
  }

  const handleClose = () => {
    navigation.goBack();
  };

  const captureCard = async (): Promise<string | null> => {
    try {
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          // TODO: Determine if png is the best format for this.
          format: 'png',
          quality: 1,
        });
        return uri;
      }
      return null;
    } catch (error) {
      // Error capturing card - fail silently
      return null;
    }
  };

  // TODO: Test sharing to Twitter.
  const handleShare = async () => {
    try {
      const imageUri = await captureCard();
      if (imageUri) {
        await Share.open({
          url: imageUri,
          message: strings('perps.pnl_hero_card.header_title'),
        });
      }
    } catch (error) {
      // User cancelled or error occurred - fail silently
    }
  };

  const handleSaveImage = async () => {
    try {
      const imageUri = await captureCard();
      if (imageUri) {
        // Use Share API with save option
        await Share.open({
          url: imageUri,
          saveToFiles: true,
        });
      }
    } catch (error) {
      // User cancelled or error occurred - fail silently
    }
  };

  const renderTabBar = () => (
    <View style={styles.progressContainer}>
      {[0, 1, 2].map((dotIndex) => (
        <View
          key={dotIndex}
          style={[
            styles.progressDot,
            currentTab === dotIndex && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );

  const pnlSign = data.pnl >= 0 ? '+' : '';
  const pnlDisplay = `${pnlSign}${data.roe.toFixed(1)}%`;
  const directionText =
    data.direction.charAt(0).toUpperCase() + data.direction.slice(1);
  const directionBadgeText = `${directionText} ${data.leverage}x`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

      {/* Content */}
      <View style={styles.carouselWrapper}>
        <View style={styles.carouselContainer}>
          <ScrollableTabView
            renderTabBar={renderTabBar}
            tabBarPosition="bottom"
            onChangeTab={handleTabChange}
            initialPage={0}
            prerenderingSiblingsNumber={1}
          >
            {[0, 1, 2].map((index) => (
              <View key={index}>
                <View style={styles.cardWrapper}>
                  {/* Card to be captured */}
                  <View
                    ref={(ref) => {
                      viewShotRefs.current[index] = ref;
                    }}
                    collapsable={false}
                  >
                    <ImageBackground
                      source={backgroundImage}
                      style={styles.cardContainer}
                      contentFit="contain"
                      contentPosition="right center"
                    >
                      {/* MetaMask Logo */}
                      <View style={styles.logoContainer}>
                        <Image
                          source={MetaMaskLogo}
                          style={styles.logo}
                          resizeMode="contain"
                        />
                      </View>

                      {/* Asset Info Row */}
                      <View style={styles.assetRow}>
                        <PerpsTokenLogo
                          symbol={data.asset}
                          size={14.5}
                          style={styles.assetIcon}
                        />
                        <Text
                          variant={TextVariant.BodySMMedium}
                          style={styles.assetName}
                        >
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
                          data.roe >= 0
                            ? styles.pnlPositive
                            : styles.pnlNegative,
                        ]}
                      >
                        {pnlDisplay}
                      </RNText>

                      <View>
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
                              ranges: PRICE_RANGES_UNIVERSAL,
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
                            {formatPerpsFiat(data.markPrice as string, {
                              ranges: PRICE_RANGES_UNIVERSAL,
                            })}
                          </Text>
                        </View>
                      </View>

                      {/* Referral Code Section */}
                      {rewardsReferralCode !== null && (
                        <View style={styles.referralContainer}>
                          <RewardsReferralCodeTag
                            referralCode={rewardsReferralCode}
                          />
                          <View style={styles.footerTextContainer}>
                            <Text
                              variant={TextVariant.BodySM}
                              style={styles.footerText}
                            >
                              {strings('perps.pnl_hero_card.referral_footer')}
                            </Text>
                            <Text
                              variant={TextVariant.BodySM}
                              style={styles.footerText}
                            >
                              {strings('perps.pnl_hero_card.referral_link', {
                                code: rewardsReferralCode,
                              })}
                            </Text>
                          </View>
                        </View>
                      )}
                    </ImageBackground>
                  </View>
                </View>
              </View>
            ))}
          </ScrollableTabView>
        </View>
      </View>

      {/* Footer Buttons */}
      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.pnl_hero_card.share_button')}
          startIconName={IconName.Share}
          onPress={handleShare}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.pnl_hero_card.save_button')}
          startIconName={IconName.Download}
          onPress={handleSaveImage}
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsHeroCardView;
