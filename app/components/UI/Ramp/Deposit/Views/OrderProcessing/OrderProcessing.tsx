import React, { useEffect } from 'react';
import { View } from 'react-native';
import styleSheet from './OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../../../StyledButton';
import DepositProgressBar from '../../components/DepositProgressBar';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

export interface OrderProcessingParams {
  quoteId: string;
}

export const createOrderProcessingNavDetails =
  createNavigationDetails<OrderProcessingParams>(
    Routes.DEPOSIT.ORDER_PROCESSING,
  );

const OrderProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quoteId } = useParams<OrderProcessingParams>();

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.order_processing.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={3} />
          <View style={styles.container}>
            <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
              Quote ID: {quoteId}
            </Text>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={() => {
              navigation.navigate(Routes.WALLET.HOME);
            }}
          >
            {strings('deposit.order_processing.button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OrderProcessing;
