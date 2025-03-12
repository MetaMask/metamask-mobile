import React, { useState, useCallback, useEffect, FC, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Linking,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createStyles, IMAGE_WIDTH, IMAGE_HEIGHT } from './index.styles';
import {
  CarouselProps,
  CarouselSlide,
  SlideId,
  NavigationAction,
} from './carousel.types';
import { dismissBanner } from '../../../reducers/banners';
import { RootState } from '../../../reducers';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useMultichainBalances } from '../../hooks/useMultichainBalances';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useTheme } from '../../../util/theme';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../UI/Ramp/routes/utils';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import cardImage from '../../../images/banners/banner_image_card.png';
import fundImage from '../../../images/banners/banner_image_fund.png';
import cashoutImage from '../../../images/banners/banner_image_cashout.png';
import aggregatedImage from '../../../images/banners/banner_image_aggregated.png';

const BannerImages: Record<SlideId, ImageSourcePropType> = {
  card: cardImage,
  fund: fundImage,
  cashout: cashoutImage,
  aggregated: aggregatedImage,
};

const PREDEFINED_SLIDES: CarouselSlide[] = [
  {
    id: 'card',
    title: strings('banner.card.title'),
    description: strings('banner.card.subtitle'),
    undismissable: false,
    navigation: { type: 'url', href: 'https://portfolio.metamask.io/card' },
    testID: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_FIRST_SLIDE_CLOSE_BUTTON,
  },
  {
    id: 'fund',
    title: strings('banner.fund.title'),
    description: strings('banner.fund.subtitle'),
    undismissable: false,
    navigation: {
      type: 'function',
      navigate: () => createBuyNavigationDetails(),
    },
    testID: WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE_TITLE,
    testIDCloseButton:
      WalletViewSelectorsIDs.CAROUSEL_SECOND_SLIDE_CLOSE_BUTTON,
  },
  {
    id: 'cashout',
    title: strings('banner.cashout.title'),
    description: strings('banner.cashout.subtitle'),
    undismissable: false,
    navigation: {
      type: 'function',
      navigate: () => createSellNavigationDetails(),
    },
    testID: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE_TITLE,
    testIDCloseButton: WalletViewSelectorsIDs.CAROUSEL_THIRD_SLIDE_CLOSE_BUTTON,
  },
  {
    id: 'aggregated',
    title: strings('banner.aggregated.title'),
    description: strings('banner.aggregated.subtitle'),
    undismissable: false,
    navigation: {
      type: 'route',
      route: Routes.ONBOARDING.GENERAL_SETTINGS,
      navigationStack: Routes.SETTINGS_VIEW,
    },
    testID: WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE,
    testIDTitle: WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE_TITLE,
    testIDCloseButton:
      WalletViewSelectorsIDs.CAROUSEL_FOURTH_SLIDE_CLOSE_BUTTON,
  },
];

export const Carousel: FC<CarouselProps> = ({ style }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { multichainBalances } = useMultichainBalances();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const styles = createStyles(colors);
  const dismissedBanners = useSelector(
    (state: RootState) => state.banners.dismissedBanners,
  );

  const [previousIsZeroBalance, setPreviousIsZeroBalance] = useState<
    boolean | null
  >(null);
  const isZeroBalance = multichainBalances.totalFiatBalance === 0;

  const slidesConfig = useMemo(
    () =>
      PREDEFINED_SLIDES.map((slide) => {
        if (slide.id === 'fund' && isZeroBalance) {
          return {
            ...slide,
            undismissable: true,
          };
        }
        return {
          ...slide,
          undismissable: false,
        };
      }),
    [isZeroBalance],
  );

  const visibleSlides = useMemo(
    () =>
      slidesConfig.filter((slide) => {
        if (slide.id === 'fund' && isZeroBalance) {
          return true;
        }
        return !dismissedBanners.includes(slide.id);
      }),
    [slidesConfig, isZeroBalance, dismissedBanners],
  );

  useEffect(() => {
    if (
      previousIsZeroBalance !== null &&
      previousIsZeroBalance !== isZeroBalance
    ) {
      setHasRendered(false);
    }
    setPreviousIsZeroBalance(isZeroBalance);
  }, [isZeroBalance, previousIsZeroBalance]);

  const isSingleSlide = visibleSlides.length === 1;

  const openUrl =
    (href: string): (() => Promise<void>) =>
    () =>
      Linking.openURL(href).catch((error) => {
        console.error('Failed to open URL:', error);
      });

  const handleRenderSlides = useCallback(
    (renderedSlides: typeof PREDEFINED_SLIDES) => {
      if (!hasRendered) {
        renderedSlides.forEach((slide) => {
          trackEvent(
            createEventBuilder({
              category: 'Banner Display',
              properties: {
                name: slide.id,
              },
            }).build(),
          );
        });
        setHasRendered(true);
      }
    },
    [hasRendered, trackEvent, createEventBuilder],
  );

  const handleSlideClick = useCallback(
    (slideId: string, navigation: NavigationAction) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Select',
          properties: {
            name: slideId,
          },
        }).build(),
      );

      if (navigation.type === 'url') {
        return openUrl(navigation.href)();
      }

      if (navigation.type === 'function') {
        return navigate(...navigation.navigate());
      }

      if (navigation.type === 'route') {
        return navigate(navigation.route);
      }
    },
    [navigate, trackEvent, createEventBuilder],
  );

  const handleClose = useCallback(
    (slideId: string) => {
      dispatch(dismissBanner(slideId));
    },
    [dispatch],
  );

  useEffect(() => {
    if (visibleSlides.length > 0) {
      handleRenderSlides(visibleSlides);
    }
  }, [visibleSlides, handleRenderSlides, isZeroBalance]);

  if (visibleSlides.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, style]}
      testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
    >
      <View style={styles.bannerContainer}>
        <ScrollableTabView
          renderTabBar={() => <View />}
          onChangeTab={({ i }) => setSelectedIndex(i)}
          locked={isSingleSlide}
          initialPage={0}
          contentProps={{
            style: {
              overflow: 'visible',
            },
          }}
        >
          {visibleSlides.map((slide) => (
            <Pressable
              key={slide.id}
              testID={slide.testID}
              style={[
                styles.slideContainer,
                pressedSlideId === slide.id && styles.slideContainerPressed,
              ]}
              onPress={() => handleSlideClick(slide.id, slide.navigation)}
              onPressIn={() => setPressedSlideId(slide.id)}
              onPressOut={() => setPressedSlideId(null)}
            >
              <View style={styles.slideContent}>
                <View style={styles.imageContainer}>
                  <Image
                    source={BannerImages[slide.id]}
                    style={{
                      width: IMAGE_WIDTH,
                      height: IMAGE_HEIGHT,
                    }}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.textWrapper}>
                    <Text
                      variant={TextVariant.BodyMD}
                      style={styles.title}
                      testID={slide.testIDTitle}
                    >
                      {slide.title}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      style={styles.description}
                    >
                      {slide.description}
                    </Text>
                  </View>
                </View>
                {!slide.undismissable && (
                  <TouchableOpacity
                    testID={slide.testIDCloseButton}
                    style={styles.closeButton}
                    onPress={() => handleClose(slide.id)}
                  >
                    <Icon name="close" size={18} color={colors.icon.default} />
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollableTabView>
      </View>
      {!isSingleSlide && (
        <View
          testID={WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS}
          style={styles.progressContainer}
        >
          {visibleSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                selectedIndex === index && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default Carousel;
