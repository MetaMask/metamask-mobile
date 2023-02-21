import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, FlatList, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modal';
import { connect } from 'react-redux';
import { getOrders } from '../../../reducers/fiatOrders';
import ModalHandler from '../../Base/ModalHandler';
import OrderListItem from './OrderListItem';
import OrderDetails from './OrderDetails';
import { useTheme } from '../../../util/theme';
import { useNavigation } from '@react-navigation/native';
import { FIAT_ORDER_PROVIDERS } from '../../../constants/on-ramp';
import { createOrderDetailsNavDetails } from '../../UI/FiatOnRampAggregator/Views/OrderDetails';

const createStyles = (colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
  });
function FiatOrdersView({ orders, ...props }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const keyExtractor = (item) => item.id;

  const handleNavigateToTxDetails = useCallback(
    (orderId) => {
      navigation.navigate(
        ...createOrderDetailsNavDetails({
          orderId,
        }),
      );
    },
    [navigation],
  );

  const renderItem = ({ item }) => {
    if (item.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR) {
      return (
        <TouchableHighlight
          style={styles.row}
          onPress={() => handleNavigateToTxDetails(item.id)}
          underlayColor={colors.background.alternative}
          activeOpacity={1}
        >
          <OrderListItem order={item} />
        </TouchableHighlight>
      );
    }
    return (
      <ModalHandler>
        {({ isVisible, toggleModal }) => (
          <>
            <TouchableHighlight
              style={styles.row}
              onPress={toggleModal}
              underlayColor={colors.background.alternative}
              activeOpacity={1}
            >
              <OrderListItem order={item} />
            </TouchableHighlight>

            <Modal
              isVisible={isVisible}
              onBackdropPress={toggleModal}
              onBackButtonPress={toggleModal}
              onSwipeComplete={toggleModal}
              swipeDirection="down"
              backdropColor={colors.overlay.default}
              backdropOpacity={1}
            >
              <OrderDetails order={item} closeModal={toggleModal} />
            </Modal>
          </>
        )}
      </ModalHandler>
    );
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </View>
  );
}

FiatOrdersView.propTypes = {
  orders: PropTypes.array,
  item: PropTypes.any,
};

const mapStateToProps = (state) => ({
  orders: getOrders(state),
});

export default connect(mapStateToProps)(FiatOrdersView);
