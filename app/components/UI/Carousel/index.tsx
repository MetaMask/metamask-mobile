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
  Text,
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
import { selectDismissedBanners } from '../../../selectors/banner';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import {
  selectSelectedInternalAccount,
  selectLastSelectedSolanaAccount,
} from '../../../selectors/accountsController';
import { SolAccountType, SolScope } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
///: END:ONLY_INCLUDE_IF
import { selectAddressHasTokenBalances } from '../../../selectors/tokenBalancesController';
import {
  fetchCarouselSlidesFromContentful,
  isActive,
} from './fetchCarouselSlidesFromContentful';
import { selectContentfulCarouselEnabledFlag } from './selectors/featureFlags';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import Routes from '../../../constants/navigation/Routes';

const MAX_CAROUSEL_SLIDES = 8;

// Constants from original styles
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 66;
const DOTS_HEIGHT = 18;
const PEEK_WIDTH = 5;

function orderByCardPlacement(slides: CarouselSlide[]): CarouselSlide[] {
  const placed: (CarouselSlide | undefined)[] = [];
  const unplaced: CarouselSlide[] = [];

  for (const s of slides) {
    const raw = s.cardPlacement;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof n === 'number' && Number.isFinite(n)) {
      const idx = Math.max(0, Math.floor(n) - 1); // convert 1-based to 0-based
      if (idx >= placed.length) placed.length = idx + 1;
      placed[idx] = s;
    } else {
      unplaced.push(s);
    }
  }

  let up = 0;
  for (let i = 0; i < placed.length && up < unplaced.length; i++) {
    if (!placed[i]) placed[i] = unplaced[up++];
  }
  while (up < unplaced.length) placed.push(unplaced[up++]);

  return placed.filter(Boolean) as CarouselSlide[];
}

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

  const applyLocalNavigation = useCallback(
    (s: CarouselSlide): CarouselSlide => {
      // fund → open buy flow
      if (s.variableName === 'fund') {
        return {
          ...s,
          navigation: {
            type: 'function',
            navigate: () => createBuyNavigationDetails(),
          },
        };
      }
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      // solana → open add-account flow (if we don't already redirect below)
      if (s.variableName === 'solana') {
        return {
          ...s,
          navigation: {
            type: 'function',
            navigate: () =>
              [
                Routes.MODAL.ROOT_MODAL_FLOW,
                {
                  screen: Routes.SHEET.ADD_ACCOUNT,
                  params: {
                    clientType: WalletClientType.Solana,
                    scope: SolScope.Mainnet,
                  },
                },
              ] as const,
          },
        };
      }
      ///: END:ONLY_INCLUDE_IF
      return s; // keep Contentful linkUrl for everything else
    },
    [],
  );

  const slidesConfig = useMemo(() => {
    const patch = (s: CarouselSlide): CarouselSlide => {
      const withNav = applyLocalNavigation(s);
      if (withNav.variableName === 'fund' && isZeroBalance) {
        return { ...withNav, undismissable: withNav.undismissable || true };
      }
      return withNav;
    };

    const priority = priorityContentfulSlides.map(patch);
    const regular = orderByCardPlacement(regularContentfulSlides.map(patch));
    return [...priority, ...regular];
  }, [
    applyLocalNavigation,
    isZeroBalance,
    priorityContentfulSlides,
    regularContentfulSlides,
  ]);

  const visibleSlides = useMemo(() => {
    const filtered = slidesConfig.filter((slide: CarouselSlide) => {
      const active = isActive(slide);
      if (!active) return false;

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (
        slide.variableName === 'solana' &&
        selectedAccount?.type === SolAccountType.DataAccount
      ) {
        return false;
      }
      ///: END:ONLY_INCLUDE_IF

      return !dismissedBanners.includes(slide.id);
    });
    return filtered.slice(0, MAX_CAROUSEL_SLIDES);
  }, [
    slidesConfig,
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
        // @ts-expect-error - TODO: Fix this to use RootParamList types
        return navigate(...navigation.navigate());
      }

      if (navigation.type === 'route') {
        // @ts-expect-error - TODO: Fix this to use RootParamList types
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
          paddingLeft: 0,
        })}
        onPress={() => handleSlideClick(slide.id, slide.navigation)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="w-full h-full"
        >
          <Box
            style={tw.style('overflow-hidden justify-center items-center', {
              width: 66,
              height: 66,
            })}
          >
            <RNImage
              source={slide.image ? { uri: slide.image } : { uri: undefined }}
              style={tw.style({ width: 66, height: 66 })}
              resizeMode="contain"
            />
          </Box>
          <Box twClassName="flex-1 justify-center py-3 pl-3">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={`carousel-slide-${slide.id}-title`}
              numberOfLines={1}
            >
              {slide.title}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {slide.description}
            </Text>
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
            name: slide.variableName ?? slide.id,
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
      style={tw.style(
        'self-center overflow-visible',
        {
          width: BANNER_WIDTH + PEEK_WIDTH * 2,
          height: CAROUSEL_HEIGHT + DOTS_HEIGHT,
        },
        style,
      )}
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
