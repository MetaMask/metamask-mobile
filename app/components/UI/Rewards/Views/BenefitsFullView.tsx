import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';
import { useSelector } from 'react-redux';
import { FlatList, ListRenderItem, RefreshControl } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { selectBenefits } from '../../../../reducers/rewards/selectors.ts';
import { useBenefits } from '../hooks/useBenefits.ts';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';
import BenefitCard from '../components/Benefits/BenefitCard.tsx';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import TheMiracleFooter from '../components/Benefits/TheMiracleFooter.tsx';
import BenefitEmptyList from '../components/Benefits/BenefitEmptyList.tsx';

const BenefitsFullView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const benefits = useSelector(selectBenefits);
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

  const hasBenefits = useMemo(() => benefits.length > 0, [benefits.length]);

  const renderBenefitItem: ListRenderItem<SubscriptionBenefitDto> = useCallback(
    ({ item }) => <BenefitCard benefit={item} />,
    [],
  );

  return (
    <ErrorBoundary navigation={navigation} view="BenefitsFullView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.LIST_BENEFIT_VIEW}
      >
        <HeaderCompactStandard
          title={strings('rewards.benefits.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        {!hasBenefits ? (
          <BenefitEmptyList />
        ) : (
          <Box twClassName="h-full p-4">
            <FlatList
              data={benefits}
              renderItem={renderBenefitItem}
              keyExtractor={(item) => item.id.toString()}
              ListFooterComponent={<TheMiracleFooter />}
              ListEmptyComponent={<BenefitEmptyList />}
              ListHeaderComponent={
                <Text twClassName="py-3" variant={TextVariant.HeadingMd}>
                  {strings('rewards.benefits.list_header')}
                </Text>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('gap-3 pb-24')}
              style={tw.style('flex-1')}
            />
          </Box>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};
export default BenefitsFullView;
