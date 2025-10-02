import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Alert, Image, View } from 'react-native';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { usePredictCashOutAmounts } from '../../hooks/usePredictCashOutAmounts';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatPrice } from '../../utils/format';
import styleSheet from './PredictCashOut.styles';

const PredictCashOut = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictCashOut'>>();
  const { position } = route.params;

  const { icon, title, outcome: outcomeSideText, initialValue } = position;

  const outcomeTitle = title;

  const { placeOrder, isLoading } = usePredictPlaceOrder({
    onComplete: () => {
      try {
        dispatch(StackActions.pop());
        dispatch(StackActions.replace(Routes.PREDICT.MARKET_LIST));
      } catch (error) {
        // Navigation errors shouldn't prevent the order from being considered successful
        console.warn('Navigation error after successful cash out:', error);
      }
    },
    onError: (error) => {
      Alert.alert('Order failed', error);
    },
  });

  const {
    cashOutAmounts: { currentValue, percentPnl, cashPnl },
  } = usePredictCashOutAmounts({
    position,
    autoRefreshTimeout: 5000,
  });

  const signal = useMemo(() => (cashPnl > 0 ? '+' : '-'), [cashPnl]);

  const onCashOut = () => {
    // Implement cash out action here
    placeOrder({
      outcomeId: position.outcomeId,
      outcomeTokenId: position.outcomeTokenId,
      side: Side.SELL,
      size: position.amount,
      providerId: position.providerId,
    });
  };

  return (
    <BottomSheet isFullscreen>
      <BottomSheetHeader onClose={() => goBack()}>
        <Text variant={TextVariant.HeadingMD}>Cash Out</Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <View style={styles.cashOutContainer}>
          <Text style={styles.currentValue}>
            {formatPrice(currentValue, { minimumDecimals: 2 })}
          </Text>
          <Text
            style={styles.percentPnl}
            color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
          >
            {`${signal}${formatPrice(Math.abs(cashPnl), {
              minimumDecimals: 2,
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
                {formatPrice(initialValue, { minimumDecimals: 2 })} on{' '}
                {outcomeSideText}
              </Text>
            </View>
          </View>
          <View style={styles.cashOutButtonContainer}>
            <Button
              label="Cash out"
              variant={ButtonVariants.Secondary}
              onPress={onCashOut}
              style={{
                ...styles.cashOutButton,
                backgroundColor: colors.primary.default,
              }}
              disabled={isLoading}
              loading={isLoading}
            />
            <Text variant={TextVariant.BodySM} style={styles.cashOutButtonText}>
              Funds will be added to your available balance
            </Text>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default PredictCashOut;
