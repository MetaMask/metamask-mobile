import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import ScreenView from '../../../../Base/ScreenView';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPrice } from '../../utils/format';

interface PredictMarketDetailsProps {}

const styleSheet = () => ({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  headerContainer: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  button: {
    width: '100%' as const,
  },
});

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();

  const { position } = route.params;

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('predict.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const onCashOut = () => {
    navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.CASH_OUT,
      params: { position },
    });
  };

  return (
    <ScreenView>
      <View style={styles.content}>
        <Text variant={TextVariant.HeadingLG}>Market Detail</Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {position.title}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Outcome: {position.outcome}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Current Value:{' '}
          {formatPrice(position.currentValue, { maximumDecimals: 2 })}
        </Text>
        <Button
          label="Cash Out"
          variant={ButtonVariants.Primary}
          style={styles.button}
          onPress={onCashOut}
        >
          Cash Out
        </Button>
      </View>
    </ScreenView>
  );
};

export default PredictMarketDetails;
