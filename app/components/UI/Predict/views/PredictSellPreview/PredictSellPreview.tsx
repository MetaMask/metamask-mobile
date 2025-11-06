import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import { useTheme } from '../../../../../util/theme';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatPrice } from '../../utils/format';
import styleSheet from './PredictSellPreview.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictCashOutSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

const PredictSellPreview = () => {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictSellPreview'>>();
  const { position } = route.params;

  const { icon, title, outcome: outcomeSideText, initialValue } = position;

  const outcomeTitle = title;

  const { placeOrder, isLoading } = usePredictPlaceOrder();

  const { preview, isCalculating } = usePredictOrderPreview({
    providerId: position.providerId,
    marketId: position.marketId,
    outcomeId: position.outcomeId,
    outcomeTokenId: position.outcomeTokenId,
    side: Side.SELL,
    size: position.amount,
    autoRefreshTimeout: 5000,
  });

  const currentValue = preview?.minAmountReceived ?? 0;
  const { cashPnl, percentPnl } = position;

  const signal = useMemo(() => (cashPnl >= 0 ? '+' : '-'), [cashPnl]);

  const onCashOut = () => {
    if (!preview) return;
    // Implement cash out action here
    placeOrder({
      providerId: position.providerId,
      preview,
    });
    dispatch(StackActions.pop());
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <BottomSheetHeader onClose={() => goBack()}>
        <Text variant={TextVariant.HeadingMD}>Cash Out</Text>
      </BottomSheetHeader>
      <View
        testID={PredictCashOutSelectorsIDs.CONTAINER}
        style={styles.container}
      >
        <View style={styles.cashOutContainer}>
          <Text style={styles.currentValue}>
            {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
          <Text
            style={styles.percentPnl}
            color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
          >
            {`${signal}${formatPrice(Math.abs(cashPnl), {
              maximumDecimals: 2,
            })} (${formatPercentage(percentPnl)})`}
          </Text>
        </View>
        <View style={styles.bottomContainer}>
          <View style={styles.positionContainer}>
            <View>
              <Image source={{ uri: icon }} style={styles.positionIcon} />
            </View>
            <View style={styles.positionDetails}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.detailsLeft}
              >
                {outcomeTitle}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.detailsResolves}
              >
                {formatPrice(initialValue, { maximumDecimals: 2 })} on{' '}
                {outcomeSideText}
              </Text>
            </View>
          </View>
          <View style={styles.cashOutButtonContainer}>
            <Button
              testID={PredictCashOutSelectorsIDs.SELL_PREVIEW_CASH_OUT_BUTTON}
              label="Cash out"
              variant={ButtonVariants.Secondary}
              disabled={!preview || isCalculating || isLoading}
              onPress={onCashOut}
              style={{
                ...styles.cashOutButton,
                backgroundColor: colors.primary.default,
              }}
              loading={isLoading}
            />
            <Text variant={TextVariant.BodySM} style={styles.cashOutButtonText}>
              Funds will be added to your available balance
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PredictSellPreview;
