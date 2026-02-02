import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useEffect } from 'react';
import { Pressable } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  formatCurrencyValue,
  formatPercentage,
  formatPositionSize,
  formatPrice,
} from '../../utils/format';
import { PredictActivityType } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import UsdcIcon from './usdc.svg';
import { PredictActivityDetailsSelectorsIDs } from '../../Predict.testIds';
interface PredictActivityDetailProps {}

const PredictActivityDetails: React.FC<PredictActivityDetailProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictActivityDetail'>>();
  const { activity } = route.params || {};
  const { colors } = useTheme();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Determine activity type for analytics
  const activityType = useMemo(() => {
    if (!activity) return PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST;

    switch (activity.type) {
      case PredictActivityType.BUY:
        return PredictEventValues.ACTIVITY_TYPE.PREDICTED;
      case PredictActivityType.SELL:
        return PredictEventValues.ACTIVITY_TYPE.CASHED_OUT;
      case PredictActivityType.CLAIM:
        return PredictEventValues.ACTIVITY_TYPE.CLAIMED;
      default:
        return PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST;
    }
  }, [activity]);

  // Track activity detail viewed
  useEffect(() => {
    if (!activity) return;

    Engine.context.PredictController.trackActivityViewed({
      activityType,
    });
  }, [activity, activityType]);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.PREDICT.ROOT);
    }
  };

  interface DetailRow {
    label: string;
    value: string;
    color?: TextColor;
  }

  const activityDetails = useMemo(() => {
    if (!activity) {
      return null;
    }

    const entry = activity.entry;
    const isBuy = activity.type === PredictActivityType.BUY;
    const isSell = activity.type === PredictActivityType.SELL;
    const isClaim = activity.type === PredictActivityType.CLAIM;

    const headerTitle = (() => {
      switch (activity.type) {
        case PredictActivityType.BUY:
          return strings('predict.transactions.buy_title');
        case PredictActivityType.SELL:
          return strings('predict.transactions.sell_title');
        case PredictActivityType.CLAIM:
          return strings('predict.transactions.claim_title');
        default:
          return strings('predict.transactions.activity_details');
      }
    })();

    const amountDisplay = formatCurrencyValue(activity.amountUsd);
    const showAmountBadge = Boolean(!isBuy && amountDisplay);

    const rawTimestamp =
      typeof entry === 'object' && 'timestamp' in entry
        ? entry.timestamp
        : undefined;
    const timestampMs =
      typeof rawTimestamp === 'number'
        ? rawTimestamp > 1e12
          ? rawTimestamp
          : rawTimestamp * 1000
        : undefined;
    const formattedDate = timestampMs
      ? new Date(timestampMs).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : strings('predict.transactions.not_available');

    const MARKET_TITLE_MAX_LENGTH = 40;
    const marketTitleRaw =
      activity.marketTitle?.trim() ||
      strings('predict.transactions.not_available');
    const marketTitleDisplay =
      marketTitleRaw.length > MARKET_TITLE_MAX_LENGTH
        ? `${marketTitleRaw.slice(0, MARKET_TITLE_MAX_LENGTH - 3)}...`
        : marketTitleRaw;
    const outcomeTitle =
      activity.outcome ?? strings('predict.transactions.not_available');

    const marketRows: DetailRow[] = [
      { label: strings('predict.transactions.date'), value: formattedDate },
    ];

    if (!isClaim) {
      marketRows.push({ label: 'Market', value: marketTitleDisplay });
      marketRows.push({ label: 'Outcome', value: outcomeTitle });
    }

    const entryAmount =
      'amount' in entry && typeof entry.amount === 'number'
        ? entry.amount
        : activity.amountUsd;

    const predictedAmount = formatCurrencyValue(entryAmount, {
      showSign: isSell,
    });

    const hasPrice = 'price' in entry && typeof entry.price === 'number';
    const pricePerShare = hasPrice
      ? formatPrice(entry.price, {
          minimumDecimals: entry.price >= 1 ? 2 : 4,
          maximumDecimals: entry.price >= 1 ? 2 : 4,
        })
      : undefined;

    const sharesCount =
      hasPrice && entry.price !== 0 ? entryAmount / entry.price : undefined;
    const formattedShares =
      sharesCount !== undefined ? formatPositionSize(sharesCount) : undefined;

    const priceImpact =
      activity.priceImpactPercentage !== undefined
        ? formatPercentage(activity.priceImpactPercentage)
        : undefined;

    const transactionRows: DetailRow[] = [];

    if (isClaim) {
      const totalNetPnlValue = formatCurrencyValue(
        activity.totalNetPnlUsd ?? entryAmount,
        { showSign: true },
      );
      if (totalNetPnlValue) {
        transactionRows.push({
          label: strings('predict.transactions.total_net_pnl'),
          value: totalNetPnlValue,
          color: TextColor.Success,
        });
      }

      const marketNetPnlValue = formatCurrencyValue(
        activity.netPnlUsd ?? entryAmount,
        { showSign: true },
      );
      if (marketNetPnlValue) {
        const marketLabel =
          marketTitleRaw !== strings('predict.transactions.not_available')
            ? marketTitleRaw
            : strings('predict.transactions.market_net_pnl');
        transactionRows.push({
          label: marketLabel,
          value: marketNetPnlValue,
          color: TextColor.Success,
        });
      }
    } else {
      if (predictedAmount && !isSell) {
        transactionRows.push({
          label: strings('predict.transactions.predicted_amount'),
          value: predictedAmount,
        });
      }

      if (formattedShares) {
        transactionRows.push({
          label: isSell
            ? strings('predict.transactions.shares_sold')
            : strings('predict.transactions.shares_bought'),
          value: `${formattedShares}`,
        });
      }

      if (pricePerShare) {
        transactionRows.push({
          label: strings('predict.transactions.price_per_share'),
          value: pricePerShare,
        });
      }

      if (!isSell && priceImpact) {
        transactionRows.push({
          label: strings('predict.transactions.price_impact'),
          value: priceImpact,
        });
      }
    }

    const netPnlRows: DetailRow[] = [];
    const netPnlNumeric = isSell
      ? (activity.netPnlUsd ?? entryAmount)
      : activity.netPnlUsd;
    const netPnlValue = formatCurrencyValue(netPnlNumeric, { showSign: true });
    if (netPnlValue && isSell) {
      const isNegative = typeof netPnlNumeric === 'number' && netPnlNumeric < 0;
      netPnlRows.push({
        label: strings('predict.transactions.net_pnl'),
        value: netPnlValue,
        color: isNegative ? TextColor.Error : TextColor.Success,
      });
    }

    return {
      headerTitle,
      amountDisplay,
      showAmountBadge,
      marketRows,
      transactionRows,
      netPnlRows,
    };
  }, [activity]);

  const renderHeader = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="mb-6"
    >
      <Pressable
        onPress={handleBackPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={strings('back')}
        style={tw.style('items-center justify-center rounded-full w-10 h-10')}
        testID={PredictActivityDetailsSelectorsIDs.BACK_BUTTON}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Md}
          color={colors.icon.default}
        />
      </Pressable>
      <Text
        variant={TextVariant.HeadingMD}
        color={TextColor.Default}
        testID={PredictActivityDetailsSelectorsIDs.TITLE_TEXT}
      >
        {activityDetails?.headerTitle ??
          strings('predict.transactions.activity_details')}
      </Text>
      <Box twClassName="w-10" />
    </Box>
  );

  const renderDetailRow = (
    label: string,
    value: string,
    valueColor?: TextColor,
    key?: React.Key,
  ) => (
    <Box
      key={key ?? label}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-3"
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {label}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={valueColor || TextColor.Default}
      >
        {value}
      </Text>
    </Box>
  );

  const renderAmountDisplay = () => {
    if (!activityDetails?.showAmountBadge || !activityDetails.amountDisplay) {
      return null;
    }

    return (
      <Box twClassName="items-center my-12">
        <Box twClassName="w-20 h-20 rounded-full items-center justify-center">
          <UsdcIcon
            name="Usdc"
            width={48}
            height={48}
            accessibilityLabel="USDC"
          />
        </Box>
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          testID={PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY}
        >
          {activityDetails.amountDisplay}
        </Text>
      </Box>
    );
  };

  const renderPredictionMarketDetails = () => {
    if (!activityDetails) {
      return null;
    }

    return (
      <Box twClassName="mb-6">
        {activityDetails.marketRows.map((row, index) => (
          <React.Fragment key={`${row.label}-${index}`}>
            {renderDetailRow(row.label, row.value, row.color)}
            {index < activityDetails.marketRows.length - 1 ? (
              <Box twClassName="w-full h-px" />
            ) : null}
          </React.Fragment>
        ))}
        {activity?.type === PredictActivityType.BUY ||
          activity?.type === PredictActivityType.SELL}{' '}
        (
        <Box twClassName="w-full border-t border-muted mt-3" />)
      </Box>
    );
  };

  const renderTransactionDetails = () => {
    if (!activityDetails || activityDetails.transactionRows.length === 0) {
      return null;
    }

    return (
      <Box twClassName="mb-6">
        {activityDetails.transactionRows.map((row, index) => {
          const key = `${row.label}-${index}`;
          const rowNode = renderDetailRow(row.label, row.value, row.color, key);
          return <React.Fragment key={key}>{rowNode}</React.Fragment>;
        })}
      </Box>
    );
  };

  const renderNetPnl = () => {
    if (!activityDetails || activityDetails.netPnlRows.length === 0) {
      return null;
    }

    return (
      <Box twClassName="mt-4 border-t border-muted pt-4">
        {activityDetails.netPnlRows.map((row, index) =>
          renderDetailRow(
            row.label,
            row.value,
            row.color,
            `${row.label}-${index}`,
          ),
        )}
      </Box>
    );
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
      testID={PredictActivityDetailsSelectorsIDs.CONTAINER}
    >
      <Box twClassName="flex-1">
        <Box twClassName="px-4" style={{ paddingTop: insets.top + 12 }}>
          {renderHeader()}
          {renderAmountDisplay()}
          {renderPredictionMarketDetails()}
          {renderTransactionDetails()}
          {renderNetPnl()}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default PredictActivityDetails;
