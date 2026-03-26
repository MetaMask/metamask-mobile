import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';
import { useSelector } from 'react-redux';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../reducers/benefits/selectors.ts';
import { useBenefits } from '../hooks/useBenefits.ts';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';
import BenefitCard from '../components/Benefits/BenefitCard.tsx';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';

const BenefitListView = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const benefits = useSelector(selectBenefits);
  const isLoading = useSelector(selectBenefitsLoading);
  const [refreshing, setRefreshing] = useState(false);

  const { getAllBenefits } = useBenefits();

  useEffect(() => {
    const loadBenefits = async () => {
      setRefreshing(true);
      try {
        await getAllBenefits();
      } finally {
        setRefreshing(false);
      }
    };
    loadBenefits();
  }, [getAllBenefits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getAllBenefits();
    } finally {
      setRefreshing(false);
    }
  }, [getAllBenefits]);

  const renderBenefitItem: ListRenderItem<SubscriptionBenefitDto> = useCallback(
    ({ item }) => <BenefitCard benefit={item} />,
    [],
  );

  const renderFooter = useCallback(() => {
    if (isLoading || benefits?.length === 0) return null;
    return (
      <Box twClassName="pb-2 items-center justify-center">
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative text-center"
        >
          Provided by The Miracle
        </Text>
      </Box>
    );
  }, [isLoading, benefits?.length]);

  const emptyComponent = useMemo(() => {
    if (isLoading || refreshing) return null;
    return (
      <Box twClassName="flex-1 items-center justify-center">
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          No benefits available
        </Text>
      </Box>
    );
  }, [isLoading, refreshing]);

  return (
    <SafeAreaView
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
    >
      <Box
        twClassName="flex-1 px-4"
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
      >
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default mb-4 pt-2"
        >
          {strings('rewards.benefits.title')}
        </Text>
        {benefits?.length === 0 ? (
          emptyComponent
        ) : (
          <FlatList
            data={benefits}
            renderItem={renderBenefitItem}
            keyExtractor={(item) => item.id.toString()}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('pb-6 gap-2')} // gap-2 between items
            style={tw.style('flex-1')}
          />
        )}
      </Box>
    </SafeAreaView>
  );
};
export default BenefitListView;
