import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  FontWeight,
  SectionDivider,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import TagBase from '../../../../../component-library/base-components/TagBase';
import {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase/TagBase.types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useFormatters } from '../../../../hooks/useFormatters';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../UI/Money/hooks/useMoneyAccountInfo';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import { useDeFiPositionsForHomepage } from '../DeFi/hooks';
import { usePredictPositionsForHomepage } from '../Predictions/hooks';
import { usePredictionsCommonSetup } from '../Predictions/hooks/usePredictionsSectionNavigation';
import { usePerpsPortfolioBalance } from '../../../../UI/Perps/hooks/usePerpsPortfolioBalance';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { buildAllocationValues } from './allocationUtils';
import { AllocationSectionTestIds } from './AllocationSection.testIds';

interface AllocationSectionContentProps {
  perpsBalance: number;
}

interface AllocationRow {
  key: 'money' | 'tokens' | 'perpetuals' | 'predictions' | 'defi';
  label: string;
  value: number;
  percentage: number;
  apy?: number;
  onPress: () => void;
}

const ALLOCATION_RANK_COLORS = [
  brandColor.blue600,
  brandColor.blue500,
  brandColor.blue300,
  brandColor.indigo300,
  brandColor.blue100,
] as const;

const styles = StyleSheet.create({
  allocationBar: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
    overflow: 'hidden',
  },
  allocationSegment: {
    minWidth: 4,
    borderRadius: 4,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    opacity: 0.65,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  labelLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

const AllocationSectionContent = ({
  perpsBalance,
}: AllocationSectionContentProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const { totalFiatRaw, apyPercent } = useMoneyAccountBalance();
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { handleViewAllFromPositions, isPredictEnabled } =
    usePredictionsCommonSetup();
  const { positions: predictPositions } = usePredictPositionsForHomepage({
    enabled: isPredictEnabled,
  });
  const { positions: defiPositions } = useDeFiPositionsForHomepage(
    Number.MAX_SAFE_INTEGER,
  );

  const currency = accountGroupBalance?.userCurrency ?? 'USD';
  const tokenBalance = accountGroupBalance?.totalBalanceInUserCurrency ?? 0;
  const moneyBalance = hasMoneyAccount
    ? Number.parseFloat(totalFiatRaw ?? '0')
    : 0;
  const predictionsBalance = predictPositions.reduce(
    (sum, position) => sum + Math.max(position.currentValue ?? 0, 0),
    0,
  );
  const defiBalance = defiPositions.reduce(
    (sum, position) =>
      sum +
      Math.max(
        Number(position.protocolAggregate.aggregatedMarketValue ?? 0),
        0,
      ),
    0,
  );

  const navigateToTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation]);
  const navigateToPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'home_section' },
    } as never);
  }, [navigation]);
  const navigateToDeFi = useCallback(() => {
    navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW as never);
  }, [navigation]);

  const rows = useMemo(() => {
    const allocations = buildAllocationValues([
      { key: 'money', value: moneyBalance },
      { key: 'tokens', value: tokenBalance },
      { key: 'perpetuals', value: perpsBalance },
      { key: 'predictions', value: predictionsBalance },
      { key: 'defi', value: defiBalance },
    ]);
    const navigationByKey = {
      money: navigateToMoneyHome,
      tokens: navigateToTokens,
      perpetuals: navigateToPerps,
      predictions: handleViewAllFromPositions,
      defi: navigateToDeFi,
    };

    return allocations.map(({ key, value, percentage }) => ({
      key,
      label: strings(`homepage.sections.${key}`),
      value,
      percentage,
      apy: key === 'money' ? apyPercent : undefined,
      onPress: navigationByKey[key as keyof typeof navigationByKey],
    })) as AllocationRow[];
  }, [
    apyPercent,
    defiBalance,
    handleViewAllFromPositions,
    moneyBalance,
    navigateToDeFi,
    navigateToMoneyHome,
    navigateToPerps,
    navigateToTokens,
    perpsBalance,
    predictionsBalance,
    tokenBalance,
  ]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View testID={AllocationSectionTestIds.CONTAINER}>
      <SectionDivider />
      <Box paddingHorizontal={4} paddingVertical={4} gap={4}>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('homepage.sections.allocation')}
        </Text>
        <View
          style={styles.allocationBar}
          testID={AllocationSectionTestIds.BAR}
        >
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.allocationSegment,
                {
                  flex: Math.max(row.percentage, 2),
                  backgroundColor: ALLOCATION_RANK_COLORS[index],
                },
              ]}
            />
          ))}
        </View>
        <Box gap={1}>
          {rows.map((row, index) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              testID={AllocationSectionTestIds.ROW(row.key)}
              accessibilityRole="button"
              accessibilityLabel={`${row.label}, ${row.percentage.toFixed(1)}%, ${formatCurrency(row.value, currency)}`}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: ALLOCATION_RANK_COLORS[index] },
                ]}
              />
              <View style={styles.label}>
                <View style={styles.labelLine}>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                  >
                    {row.label}
                    <Text color={TextColor.TextAlternative}>
                      {` · ${row.percentage.toFixed(1)}%`}
                    </Text>
                  </Text>
                  {row.apy !== undefined && row.apy > 0 ? (
                    <TagBase
                      severity={TagSeverity.Success}
                      shape={TagShape.Rectangle}
                    >
                      {`${row.apy}% APY`}
                    </TagBase>
                  ) : null}
                </View>
              </View>
              <SensitiveText
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                numberOfLines={1}
              >
                {formatCurrency(row.value, currency)}
              </SensitiveText>
            </Pressable>
          ))}
        </Box>
      </Box>
    </View>
  );
};

const AllocationSectionWithPerps = () => {
  const { perpsBalance } = usePerpsPortfolioBalance();
  return <AllocationSectionContent perpsBalance={perpsBalance} />;
};

const AllocationSection = () => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  if (!isPerpsEnabled) {
    return <AllocationSectionContent perpsBalance={0} />;
  }

  return (
    <PerpsConnectionProvider suppressErrorView>
      <PerpsStreamProvider>
        <AllocationSectionWithPerps />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

export default AllocationSection;
