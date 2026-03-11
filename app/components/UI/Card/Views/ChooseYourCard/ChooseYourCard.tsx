import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
  ListRenderItem,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import { ChooseYourCardSelectors } from './ChooseYourCard.testIds';
import { CardType, CardStatus } from '../../types';
import CardImage from '../../components/CardImage/CardImage';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { ShippingAddress } from '../ReviewOrder';

export type ChooseYourCardFlow = 'onboarding' | 'upgrade' | 'home';

export interface ChooseYourCardParams {
  flow?: ChooseYourCardFlow;
  shippingAddress?: ShippingAddress;
}

interface CardOption {
  id: CardType;
  name: string;
  price: string;
  features: { label: string; isHighlighted: boolean }[];
}

const ItemSeparator = ({ width }: { width: number }) => (
  <View style={{ width }} />
);

const ChooseYourCard = () => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const tw = useTailwind();
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasUserSwiped, setHasUserSwiped] = useState(false);
  const arrowAnimValue = useRef(new Animated.Value(0)).current;

  const { flow = 'onboarding', shippingAddress } =
    useParams<ChooseYourCardParams>();
  const isUpgradeFlow = flow === 'upgrade';

  // Arrow bounce animation for swipe indicator
  useEffect(() => {
    if (activeIndex !== 0 || isUpgradeFlow || hasUserSwiped) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnimValue, {
          toValue: 8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnimValue, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [activeIndex, isUpgradeFlow, arrowAnimValue, hasUserSwiped]);

  const CARD_WIDTH = screenWidth - 64;
  const CARD_SPACING = 16;

  const allCardOptions: CardOption[] = useMemo(
    () => [
      {
        id: CardType.VIRTUAL,
        name: strings('card.choose_your_card.virtual_card.name'),
        price: strings('card.choose_your_card.virtual_card.price'),
        features: [
          {
            label: strings('card.choose_your_card.virtual_card.feature_1'),
            isHighlighted: false,
          },
          {
            label: strings('card.choose_your_card.virtual_card.feature_2'),
            isHighlighted: false,
          },
          {
            label: strings('card.choose_your_card.virtual_card.feature_3'),
            isHighlighted: false,
          },
        ],
      },
      {
        id: CardType.METAL,
        name: strings('card.choose_your_card.metal_card.name'),
        price: strings('card.choose_your_card.metal_card.price'),
        features: [
          {
            label: strings(
              'card.choose_your_card.metal_card.everything_in_virtual',
            ),
            isHighlighted: false,
          },
          {
            label: strings('card.choose_your_card.metal_card.feature_1'),
            isHighlighted: true,
          },
          {
            label: strings('card.choose_your_card.metal_card.feature_2'),
            isHighlighted: true,
          },
          {
            label: strings('card.choose_your_card.metal_card.feature_3'),
            isHighlighted: true,
          },
        ],
      },
    ],
    [],
  );

  const cardOptions = useMemo(
    () =>
      isUpgradeFlow
        ? allCardOptions.filter((card) => card.id === CardType.METAL)
        : allCardOptions,
    [isUpgradeFlow, allCardOptions],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.CHOOSE_YOUR_CARD,
          flow,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, flow]);

  const peekTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const peekStoppedRef = useRef(false);

  const stopPeekAnimation = useCallback(() => {
    peekStoppedRef.current = true;
    peekTimersRef.current.forEach(clearTimeout);
    peekTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (isUpgradeFlow || cardOptions.length <= 1) return;

    const peekDistance = (CARD_WIDTH + CARD_SPACING) * 0.15;
    const BOUNCE_HOLD = 600;
    const PAUSE_BETWEEN_BOUNCES = 3000;
    const cycleDuration = BOUNCE_HOLD + PAUSE_BETWEEN_BOUNCES;

    const scheduleBounce = (delay: number) => {
      peekTimersRef.current.push(
        setTimeout(() => {
          if (peekStoppedRef.current) return;
          flatListRef.current?.scrollToOffset({
            offset: peekDistance,
            animated: true,
          });
        }, delay),
      );

      peekTimersRef.current.push(
        setTimeout(() => {
          if (peekStoppedRef.current) return;
          flatListRef.current?.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }, delay + BOUNCE_HOLD),
      );

      peekTimersRef.current.push(
        setTimeout(() => {
          if (peekStoppedRef.current) return;
          scheduleBounce(0);
        }, delay + cycleDuration),
      );
    };

    scheduleBounce(800);

    return stopPeekAnimation;
  }, [
    isUpgradeFlow,
    cardOptions.length,
    CARD_WIDTH,
    CARD_SPACING,
    stopPeekAnimation,
  ]);

  const handleContinue = useCallback(() => {
    stopPeekAnimation();
    const selectedCard = cardOptions[activeIndex];

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CHOOSE_CARD_CONTINUE,
          card_type: selectedCard.id,
          flow,
        })
        .build(),
    );

    if (selectedCard.id === CardType.VIRTUAL) {
      navigate(Routes.CARD.SPENDING_LIMIT, { flow: 'onboarding' });
    } else {
      navigate(Routes.CARD.REVIEW_ORDER, {
        shippingAddress,
        fromUpgrade: isUpgradeFlow,
      });
    }
  }, [
    activeIndex,
    cardOptions,
    navigate,
    trackEvent,
    createEventBuilder,
    flow,
    shippingAddress,
    isUpgradeFlow,
    stopPeekAnimation,
  ]);

  const handleScrollToMetal = useCallback(() => {
    stopPeekAnimation();
    setHasUserSwiped(true);
    flatListRef.current?.scrollToIndex({ index: 1, animated: true });
    setTimeout(() => setActiveIndex(1), 300);
  }, [stopPeekAnimation]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_SPACING));
      if (index !== activeIndex && index >= 0 && index < cardOptions.length) {
        stopPeekAnimation();
        setHasUserSwiped(true);
        setActiveIndex(index);
      }
    },
    [
      activeIndex,
      cardOptions.length,
      CARD_WIDTH,
      CARD_SPACING,
      stopPeekAnimation,
    ],
  );

  const renderCardItem: ListRenderItem<CardOption> = useCallback(
    ({ item }) => (
      <Box
        twClassName="rounded-xl overflow-hidden"
        style={{ width: CARD_WIDTH }}
        testID={`${ChooseYourCardSelectors.CARD_IMAGE}-${item.id}`}
      >
        <CardImage type={item.id} status={CardStatus.ACTIVE} />
      </Box>
    ),
    [CARD_WIDTH],
  );

  const renderFeatureItem = useCallback(
    (feature: string, index: number, isHighlighted: boolean) => (
      <Box key={`feature-${index}`} twClassName="flex-row items-start gap-2">
        <Icon
          name={IconName.Check}
          size={IconSize.Lg}
          color={isHighlighted ? IconColor.Info : IconColor.Muted}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName={`flex-1 ${isHighlighted ? 'text-white' : 'text-alternative'}`}
        >
          {feature}
        </Text>
      </Box>
    ),
    [],
  );

  const renderPaginationDot = useCallback(
    (index: number) => {
      const isActive = index === activeIndex;
      return (
        <View
          key={`dot-${index}`}
          style={tw.style(
            'h-3 rounded-lg',
            isActive ? 'bg-icon-default w-6' : 'bg-icon-muted w-3',
          )}
        />
      );
    },
    [activeIndex, tw],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<CardOption> | null | undefined, index: number) => ({
      length: CARD_WIDTH + CARD_SPACING,
      offset: (CARD_WIDTH + CARD_SPACING) * index,
      index,
    }),
    [CARD_WIDTH, CARD_SPACING],
  );

  const renderItemSeparator = useCallback(
    () => <ItemSeparator width={CARD_SPACING} />,
    [CARD_SPACING],
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 32,
    }),
    [],
  );

  const selectedCard = cardOptions[activeIndex];
  const showPagination = cardOptions.length > 1;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={ChooseYourCardSelectors.CONTAINER}
    >
      <Box twClassName="flex-1">
        <Box twClassName="px-4 py-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-default"
            testID={ChooseYourCardSelectors.TITLE}
          >
            {isUpgradeFlow
              ? strings('card.choose_your_card.upgrade_title')
              : strings('card.choose_your_card.title')}
          </Text>
        </Box>

        <Box twClassName="mt-4 relative">
          <FlatList
            ref={flatListRef}
            data={cardOptions}
            renderItem={renderCardItem}
            alwaysBounceHorizontal={false}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={contentContainerStyle}
            ItemSeparatorComponent={renderItemSeparator}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={getItemLayout}
            testID={ChooseYourCardSelectors.CARD_CAROUSEL}
          />
          {activeIndex === 0 &&
            !isUpgradeFlow &&
            !hasUserSwiped &&
            cardOptions.length > 1 && (
              <View
                style={tw.style(
                  'absolute right-0 top-0 bottom-0 w-16 items-center justify-center',
                )}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={['transparent', 'rgba(36, 65, 232, 0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tw.style('absolute inset-0')}
                />
                <Animated.View
                  style={[
                    tw.style('absolute right-2'),
                    { transform: [{ translateX: arrowAnimValue }] },
                  ]}
                >
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Md}
                    color={IconColor.Default}
                  />
                </Animated.View>
              </View>
            )}
        </Box>

        {showPagination && (
          <Box twClassName="flex-row justify-center items-center gap-1 mt-4">
            {cardOptions.map((_, index) => renderPaginationDot(index))}
          </Box>
        )}

        <Box twClassName="items-center mt-4 px-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-default"
            testID={ChooseYourCardSelectors.CARD_NAME}
          >
            {selectedCard.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            twClassName="text-text-alternative mt-1"
            testID={ChooseYourCardSelectors.CARD_PRICE}
          >
            {selectedCard.price}
          </Text>
        </Box>

        {selectedCard.id === CardType.METAL && (
          <Box twClassName="mt-2 w-full items-center justify-center">
            <Box twClassName="rounded-full bg-primary-muted py-2 px-4 flex-row items-center gap-2">
              <Icon
                name={IconName.TrendUp}
                size={IconSize.Sm}
                color={IconColor.Info}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                twClassName="text-info-default"
              >
                {strings('card.choose_your_card.earn_up_to_badge')}
              </Text>
            </Box>
          </Box>
        )}

        <Box twClassName="px-4 mt-4 gap-4 flex-1">
          {selectedCard.features.map((feature, index) =>
            renderFeatureItem(feature.label, index, feature.isHighlighted),
          )}
        </Box>

        <Box twClassName="px-4 pb-4 gap-2">
          <Button
            variant={ButtonVariants.Primary}
            label={
              selectedCard.id === CardType.METAL
                ? strings('card.choose_your_card.upgrade_title')
                : strings('card.choose_your_card.continue_button')
            }
            size={ButtonSize.Lg}
            onPress={handleContinue}
            width={ButtonWidthTypes.Full}
            testID={ChooseYourCardSelectors.CONTINUE_BUTTON}
          />
          {activeIndex === 0 && !isUpgradeFlow && (
            <TouchableOpacity
              onPress={handleScrollToMetal}
              testID={ChooseYourCardSelectors.UPGRADE_TO_METAL_BUTTON}
              style={tw.style('px-4 py-2 w-full items-center justify-center')}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                twClassName="text-white"
              >
                {strings('card.choose_your_card.upgrade_to_metal_label')}
              </Text>
            </TouchableOpacity>
          )}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default ChooseYourCard;
