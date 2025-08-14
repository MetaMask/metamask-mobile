import React, { useState, useCallback, FC, useMemo, useEffect } from 'react';
import {
  Pressable,
  Linking,
  Image as RNImage,
  FlatList,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { CarouselProps, CarouselSlide, NavigationAction } from './types';
import { dismissBanner } from '../../../reducers/banners';
import {
  Box,
  Text as DSText,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  ButtonIcon,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { PREDEFINED_SLIDES, BANNER_IMAGES } from './constants';
import { selectDismissedBanners } from '../../../selectors/banner';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import {
  selectSelectedInternalAccount,
  selectLastSelectedSolanaAccount,
} from '../../../selectors/accountsController';
import { isEvmAccountType, SolAccountType } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
///: END:ONLY_INCLUDE_IF
import { selectAddressHasTokenBalances } from '../../../selectors/tokenBalancesController';
import {
  fetchCarouselSlidesFromContentful,
  isActive,
} from './fetchCarouselSlidesFromContentful';
import { selectContentfulCarouselEnabledFlag } from './selectors/featureFlags';

const MAX_CAROUSEL_SLIDES = 15;

// Constants from original styles
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 66;
const DOTS_HEIGHT = 18;
const PEEK_WIDTH = 5;

const CarouselComponent: FC<CarouselProps> = ({ style }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [priorityContentfulSlides, setPriorityContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [regularContentfulSlides, setRegularContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const isContentfulCarouselEnabled = useSelector(
    selectContentfulCarouselEnabledFlag,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasBalance = useSelector(selectAddressHasTokenBalances);
  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const tw = useTailwind();
  const dismissedBanners = useSelector(selectDismissedBanners);
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const lastSelectedSolanaAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );
  ///: END:ONLY_INCLUDE_IF

  const isZeroBalance = !hasBalance;

  // Fetch slides from Contentful
  useEffect(() => {
    const loadContentfulSlides = async () => {
      if (!isContentfulCarouselEnabled) return;
      try {
        const { prioritySlides, regularSlides } =
          await fetchCarouselSlidesFromContentful();
        setPriorityContentfulSlides(
          prioritySlides.filter((slides) => isActive(slides)),
        );
        setRegularContentfulSlides(
          regularSlides.filter((slides) => isActive(slides)),
        );
      } catch (err) {
        console.warn('Failed to fetch Contentful slides:', err);
      }
    };
    loadContentfulSlides();
  }, [isContentfulCarouselEnabled]);

  // Merge all slides (predefined + contentful),
  const slidesConfig = useMemo(() => {
    const baseSlides = [
      ...priorityContentfulSlides,
      ...PREDEFINED_SLIDES,
      ...regularContentfulSlides,
    ];
    return baseSlides.map((slide) => {
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
    });
  }, [isZeroBalance, priorityContentfulSlides, regularContentfulSlides]);

  const visibleSlides = useMemo(() => {
    const filtered = slidesConfig.filter((slide: CarouselSlide) => {
      const isCurrentlyActive = isActive(slide);

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (
        slide.id === 'solana' &&
        selectedAccount?.type === SolAccountType.DataAccount
      ) {
        return false;
      }
      if (
        slide.id === 'smartAccount' &&
        selectedAccount?.type &&
        !isEvmAccountType(selectedAccount.type)
      ) {
        return false;
      }
      ///: END:ONLY_INCLUDE_IF

      if (slide.id === 'fund' && isZeroBalance) {
        return true;
      }

      return isCurrentlyActive && !dismissedBanners.includes(slide.id);
    });
    return filtered.slice(0, MAX_CAROUSEL_SLIDES);
  }, [
    slidesConfig,
    isZeroBalance,
    dismissedBanners,
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    selectedAccount,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const isSingleSlide = visibleSlides.length === 1;

  const openUrl =
    (href: string): (() => Promise<void>) =>
    () =>
      Linking.openURL(href).catch((error) => {
        console.error('Failed to open URL:', error);
      });

  const handleSlideClick = useCallback(
    (slideId: string, navigation: NavigationAction) => {
      const extraProperties: Record<string, string> = {};

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      const isSolanaBanner = slideId === 'solana';
      if (isSolanaBanner && lastSelectedSolanaAccount) {
        extraProperties.action = 'redirect-solana-account';
      } else if (isSolanaBanner && !lastSelectedSolanaAccount) {
        extraProperties.action = 'create-solana-account';
      }
      ///: END:ONLY_INCLUDE_IF

      trackEvent(
        createEventBuilder({
          category: 'Banner Select',
          properties: {
            name: slideId,
            ...extraProperties,
          },
        }).build(),
      );

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (isSolanaBanner && lastSelectedSolanaAccount) {
        return Engine.setSelectedAddress(lastSelectedSolanaAccount.address);
      }
      ///: END:ONLY_INCLUDE_IF

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
    [
      trackEvent,
      createEventBuilder,
      navigate,
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      lastSelectedSolanaAccount,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const handleClose = useCallback(
    (slideId: string) => {
      dispatch(dismissBanner(slideId));
    },
    [dispatch],
  );

  const renderBannerSlides = useCallback(
    ({ item: slide }: { item: CarouselSlide }) => (
      <Pressable
        key={slide.id}
        testID={`carousel-slide-${slide.id}`}
        style={({ pressed }) => ({
          backgroundColor: pressed
            ? tw.color('bg-muted-pressed')
            : tw.color('bg-muted'),
          borderRadius: 8,
          height: CAROUSEL_HEIGHT,
          width: BANNER_WIDTH,
          marginHorizontal: PEEK_WIDTH,
          position: 'relative',
          overflow: 'hidden',
          paddingLeft: 16,
        })}
        onPress={() => handleSlideClick(slide.id, slide.navigation)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="w-full h-full"
        >
          <Box twClassName="flex-1 justify-center py-3">
            <DSText
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={`carousel-slide-${slide.id}-title`}
              numberOfLines={1}
            >
              {slide.title}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {slide.description}
            </DSText>
          </Box>
          <Box
            style={tw.style('overflow-hidden justify-center items-center', {
              width: 66,
              height: 66,
            })}
          >
            <RNImage
              source={
                slide.id.startsWith('contentful-')
                  ? { uri: slide.image }
                  : BANNER_IMAGES[slide.id]
              }
              style={tw.style({ width: 66, height: 66 })}
              resizeMode="contain"
            />
          </Box>
          {!slide.undismissable && (
            <ButtonIcon
              iconName={IconName.Close}
              onPress={() => handleClose(slide.id)}
              testID={`carousel-slide-${slide.id}-close-button`}
              twClassName="m-1"
            />
          )}
        </Box>
      </Pressable>
    ),
    [tw, handleSlideClick, handleClose],
  );

  // Track banner display events when visible slides change
  useEffect(() => {
    visibleSlides.forEach((slide: CarouselSlide) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Display',
          properties: {
            name: slide.id,
          },
        }).build(),
      );
    });
  }, [visibleSlides, trackEvent, createEventBuilder]);

  const renderProgressDots = useMemo(
    () => (
      <Box
        testID={WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS}
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.End}
        style={{
          height: DOTS_HEIGHT,
        }}
        twClassName="gap-2"
      >
        {visibleSlides.map((slide: CarouselSlide, index: number) => (
          <Box
            key={slide.id}
            style={tw.style({
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                selectedIndex === index
                  ? tw.color('bg-icon-default')
                  : tw.color('bg-icon-muted'),
              margin: 0,
            })}
          />
        ))}
      </Box>
    ),
    [visibleSlides, selectedIndex, tw],
  );

  if (visibleSlides.length === 0) {
    return null;
  }

  return (
    <Box
      style={
        [
          {
            width: BANNER_WIDTH + PEEK_WIDTH * 2,
            alignSelf: 'center',
            height: CAROUSEL_HEIGHT + DOTS_HEIGHT,
            overflow: 'visible',
          },
          style,
        ] as const
      }
    >
      <Box style={tw.style('overflow-visible', { height: CAROUSEL_HEIGHT })}>
        <FlatList
          data={visibleSlides}
          renderItem={renderBannerSlides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(scrollEvent) => {
            const newIndex = Math.round(
              scrollEvent.nativeEvent.contentOffset.x /
                scrollEvent.nativeEvent.layoutMeasurement.width,
            );
            setSelectedIndex(newIndex);
          }}
          testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
        />
      </Box>
      {!isSingleSlide && renderProgressDots}
    </Box>
  );
};

// Split memo component so we still see a Component name when profiling
export const Carousel = React.memo(CarouselComponent);
export default Carousel;
