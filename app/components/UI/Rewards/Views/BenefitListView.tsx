import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';
import { useSelector } from 'react-redux';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
} from 'react-native';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../reducers/benefits/selectors.ts';
import { useBenefits } from '../hooks/useBenefits.ts';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';
import BenefitCard from '../components/Benefits/BenefitCard.tsx';

const BenefitListView = () => {
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
      await getAllBenefits(true);
    } finally {
      setRefreshing(false);
    }
  }, [getAllBenefits]);

  const renderBenefitItem: ListRenderItem<SubscriptionBenefitDto> = useCallback(
    ({ item }) =>
      (item: SubscriptionBenefitDto) => <BenefitCard benefit={item} />,
    [],
  );

  // Footer loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <Box twClassName="py-4">
        <ActivityIndicator size="small" />
      </Box>
    );
  };

  // Empty state
  const renderEmpty = () => {
    if (isLoading || refreshing) return null;
    return (
      <Box twClassName="py-8 items-center">
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          No benefits available
        </Text>
      </Box>
    );
  };

  return (
    <Box
      twClassName="flex-1 px-4"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-default mb-4"
      >
        {strings('rewards.benefits.title')}
      </Text>

      <FlatList
        data={benefits}
        renderItem={renderBenefitItem}
        keyExtractor={(item) => item.id.toString()}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-4')}
      />
    </Box>
  );
};

export default BenefitListView;
