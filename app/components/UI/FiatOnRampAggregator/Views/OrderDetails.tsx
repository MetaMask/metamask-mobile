import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import StyledButton from '../../StyledButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import TransactionDetail from '../components/TransactionDetails';
import Account from '../components/Account';
import { strings } from '../../../../../locales/i18n';
import { makeOrderIdSelector } from '../../../../reducers/fiatOrders';
import { useSelector } from 'react-redux';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { ScrollView } from 'react-native-gesture-handler';
import Routes from '../../../../constants/navigation/Routes';

const styles = StyleSheet.create({
  screenLayout: {
    paddingTop: 0,
  },
});

const OrderDetails = () => {
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );
  const routes = useRoute();
  // @ts-expect-error expect params error
  const order = useSelector(makeOrderIdSelector(routes?.params?.orderId));
  const { colors } = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.transaction.details_main'),
          showBack: false,
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  const handleMakeAnotherPurchase = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
  }, [navigation]);

  if (!order) {
    return <ScreenLayout />;
  }

  return (
    <ScreenLayout>
      <ScrollView>
        <ScreenLayout.Header>
          <Account />
        </ScreenLayout.Header>
        <ScreenLayout.Body>
          <ScreenLayout.Content style={styles.screenLayout}>
            <TransactionDetail
              order={order}
              provider={provider}
              frequentRpcList={frequentRpcList}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <View>
              <StyledButton type="confirm" onPress={handleMakeAnotherPurchase}>
                {strings(
                  'fiat_on_ramp_aggregator.transaction.another_purchase',
                )}
              </StyledButton>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScrollView>
    </ScreenLayout>
  );
};

export default OrderDetails;
