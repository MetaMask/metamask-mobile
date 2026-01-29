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
} from 'react-native';
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
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { ChooseYourCardSelectors } from '../../../../../../e2e/selectors/Card/ChooseYourCard.selectors';
import { CardType, CardStatus } from '../../types';
import CardImage from '../../components/CardImage/CardImage';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { ShippingAddress } from '../ReviewOrder';

export type ChooseYourCardFlow = 'onboarding' | 'upgrade';

export interface ChooseYourCardParams {
  flow?: ChooseYourCardFlow;
  shippingAddress?: ShippingAddress;
}

interface CardOption {
  id: CardType;
  name: string;
  price: string;
  features: string[];
}

const ItemSeparator = ({ width }: { width: number }) => (
  <View style={{ width }} />
);

const ChooseYourCard = () => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tw = useTailwind();
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { flow = 'onboarding', shippingAddress } =
    useParams<ChooseYourCardParams>();
  const isUpgradeFlow = flow === 'upgrade';

  const CARD_WIDTH = screenWidth - 64;
  const CARD_SPACING = 16;

  const allCardOptions: CardOption[] = useMemo(
    () => [
      {
        id: CardType.VIRTUAL,
        name: strings('card.choose_your_card.virtual_card.name'),
        price: strings('card.choose_your_card.virtual_card.price'),
        features: [
          strings('card.choose_your_card.virtual_card.feature_1'),
          strings('card.choose_your_card.virtual_card.feature_2'),
          strings('card.choose_your_card.virtual_card.feature_3'),
        ],
      },
      {
        id: CardType.METAL,
        name: strings('card.choose_your_card.metal_card.name'),
        price: strings('card.choose_your_card.metal_card.price'),
        features: [
          strings('card.choose_your_card.metal_card.feature_1'),
          strings('card.choose_your_card.metal_card.feature_2'),
          strings('card.choose_your_card.metal_card.feature_3'),
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

  const handleContinue = useCallback(() => {
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
  ]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_SPACING));
      if (index !== activeIndex && index >= 0 && index < cardOptions.length) {
        setActiveIndex(index);
      }
    },
    [activeIndex, cardOptions.length, CARD_WIDTH, CARD_SPACING],
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
    (feature: string, index: number) => (
      <Box key={`feature-${index}`} twClassName="flex-row items-start gap-2">
        <Icon
          name={IconName.Check}
          size={IconSize.Lg}
          color={IconColor.Default}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative flex-1"
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

        <Box twClassName="mt-4">
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

        <Box twClassName="px-4 mt-6 gap-4 flex-1">
          {selectedCard.features.map((feature, index) =>
            renderFeatureItem(feature, index),
          )}
        </Box>

        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.choose_your_card.continue_button')}
            size={ButtonSize.Lg}
            onPress={handleContinue}
            width={ButtonWidthTypes.Full}
            testID={ChooseYourCardSelectors.CONTINUE_BUTTON}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default ChooseYourCard;
