import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React from 'react';
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
import { usePredictSell } from '../../hooks/usePredictSell';
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
  const { placeSellOrder, loading, reset, isOrderLoading } = usePredictSell({
    onError: (error) => {
      Alert.alert('Order failed', error);
      reset();
    },
  });

  const { position } = route.params;

  const {
    icon,
    title,
    percentPnl,
    outcome,
    currentValue,
    initialValue,
    size,
    outcomeId,
    outcomeTokenId,
  } = position;

  const onCashOut = () => {
    // Implement cash out action here
    placeSellOrder({
      outcomeId,
      outcomeTokenId,
      quantity: size,
      position,
    });
    setTimeout(() => {
      dispatch(StackActions.pop());
      dispatch(StackActions.replace(Routes.PREDICT.MARKET_LIST));
    }, 1000);
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
            {formatPercentage(percentPnl)} return
          </Text>
        </View>
        <View style={styles.bottomContainer}>
          <View style={styles.positionContainer}>
            <View>
              <Image source={{ uri: icon }} style={styles.positionIcon} />
            </View>
            <View style={styles.positionDetails}>
              <View style={styles.detailsLine}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.detailsLeft}
                >
                  {title}
                </Text>
                <Text style={styles.detailsRight}>
                  {formatPrice(initialValue, { minimumDecimals: 2 })} on{' '}
                  {outcome}
                </Text>
              </View>
              <View style={styles.detailsLine}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.detailsResolves}
                >
                  Resolves automatically in 9 days
                </Text>
                <Text style={styles.detailsRight}>
                  Won {formatPrice(currentValue, { minimumDecimals: 2 })}
                </Text>
              </View>
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
              disabled={loading}
              loading={isOrderLoading(outcomeTokenId)}
            />
            <Text style={styles.cashOutButtonText}>
              All payments are made in USDC
            </Text>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default PredictCashOut;
