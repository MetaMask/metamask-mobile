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
import NegativePnlCharacter2 from '../../../../../images/negative_pnl_character_2_3x.png';
import NegativePnlCharacter3 from '../../../../../images/negative_pnl_character_3_3x.png';
import PositivePnlCharacter1 from '../../../../../images/positive_pnl_character_1_3x.png';
import PositivePnlCharacter2 from '../../../../../images/positive_pnl_character_2_3x.png';
import PositivePnlCharacter3 from '../../../../../images/positive_pnl_character_3_3x.png';
import type { Position } from '../../controllers/types';
import { darkTheme } from '@metamask/design-tokens';
import styleSheet from './PerpsHeroCardView.styles';

// To add a new card, add the image to the array and update the viewShotRefs array.
const CARD_IMAGES: ImageSourcePropType[] = [
  NegativePnlCharacter1,
  NegativePnlCharacter2,
  NegativePnlCharacter3,
  PositivePnlCharacter1,
  PositivePnlCharacter2,
  PositivePnlCharacter3,
];

const PerpsHeroCardView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRefs = useRef<(View | null)[]>(
    Array.from({ length: CARD_IMAGES.length }, () => null),
  );
  const [currentTab, setCurrentTab] = useState(0);

  // Get data from route params
  const params = route.params as {
    position: Position;
  };
  const { position } = params;

  const rewardsReferralCode = useSelector(selectReferralCode);

  // Get markets data to fetch current market price
  const { markets } = usePerpsMarkets({
    enablePolling: true,
    // We want to keep the mark price up to date while the user selects an image.
    pollingInterval: 1 * 60 * 1000,
  });

  const data = useMemo(() => {
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
  }, [position, markets]);

  const handleTabChange = useCallback((obj: { i: number }) => {
    setCurrentTab(obj.i);
  }, []);

  const { styles } = useStyles(styleSheet, { isLong: data.isLong });

  const handleClose = () => {
    navigation.goBack();
  };

  // TODO: Fix filename not being set correctly.
  const generateFileName = () => {
    const timestamp = Date.now();
    return `perps-hero-card-${timestamp}.png`;
  };

  const captureCard = async (): Promise<string | null> => {
    try {
      const currentRef = viewShotRefs.current[currentTab];
      if (currentRef) {
        const uri = await captureRef(currentRef, {
          // TODO: Determine if png is the best format for this.
          format: 'png',
          quality: 1,
          fileName: generateFileName(),
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
          // File mime type (required for sharing file with Instagram)
          type: 'image/png',
        });
      }
    } catch (error) {
      // User cancelled or error occurred - fail silently
    }
  };

  const renderTabBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: CARD_IMAGES.length }).map((_, dotIndex) => (
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
  const directionBadgeText = data.leverage
    ? `${directionText} ${data.leverage}x`
    : directionText;

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
            {CARD_IMAGES.map((image, index) => (
              <View key={index}>
                <View style={styles.cardWrapper}>
                  {/* Card to be captured */}
                  <View
                    ref={(ref) => {
                      viewShotRefs.current[index] = ref;
                    }}
                    collapsable={false}
                  >
                    <View style={styles.cardContainer}>
                      {/* Background Image */}
                      <Image
                        source={image}
                        style={styles.backgroundImage}
                        resizeMode="contain"
                      />
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
                            backgroundColor={
                              darkTheme.colors.background.mutedHover
                            }
                            fontColor={darkTheme.colors.accent04.light}
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
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollableTabView>
        </View>
      </View>

      {/* Footer Button */}
      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.pnl_hero_card.share_button')}
          startIconName={IconName.Share}
          onPress={handleShare}
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsHeroCardView;
