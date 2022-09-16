import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import { WebView } from 'react-native-webview';
import NotificationManager from '../../../../core/NotificationManager';
import { handleTransakRedirect } from '../orderProcessor/transak';
import AppConstants from '../../../../core/AppConstants';
import { getNotificationDetails } from '..';

import { getTransakWebviewNavbar } from '../../../UI/Navbar';
import { baseStyles } from '../../../../styles/common';
import { protectWalletModalVisible } from '../../../../actions/user';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import AnalyticsV2 from '../../../../util/analyticsV2';
import {
  FIAT_ORDER_PROVIDERS,
  NETWORK_ALLOWED_TOKENS,
  NETWORK_NATIVE_SYMBOL,
  PAYMENT_CATEGORY,
  PAYMENT_RAILS,
} from '../../../../constants/on-ramp';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import { ThemeContext, mockTheme } from '../../../../util/theme';

class TransakWebView extends PureComponent {
  static propTypes = {
    navigation: PropTypes.object,
    /**
     * Currently selected network
     */
    network: PropTypes.string,
    /**
     * Function to dispatch adding a new fiat order to the state
     */
    addOrder: PropTypes.func,
    /**
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getTransakWebviewNavbar(
        navigation,
        route,
        () => {
          InteractionManager.runAfterInteractions(() => {
            AnalyticsV2.trackEvent(
              AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_EXITED,
              {
                payment_rails: PAYMENT_RAILS.MULTIPLE,
                payment_category: PAYMENT_CATEGORY.MULTIPLE,
                'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK,
              },
            );
          });
        },
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  addTokenToTokensController = async (symbol, chainId) => {
    const { TokensController } = Engine.context;
    if (NETWORK_NATIVE_SYMBOL[chainId] !== symbol) {
      const newToken = (NETWORK_ALLOWED_TOKENS[chainId] || []).find(
        ({ symbol: tokenSymbol }) => symbol === tokenSymbol,
      );
      if (
        newToken &&
        !TokensController.state.tokens.includes((token) =>
          toLowerCaseEquals(token.address, newToken.address),
        )
      ) {
        const { address, symbol, decimals } = newToken;
        await TokensController.addToken(address, symbol, decimals);
      }
    }
  };

  handleNavigationStateChange = async (navState) => {
    if (
      navState.url.indexOf(AppConstants.FIAT_ORDERS.TRANSAK_REDIRECT_URL) > -1
    ) {
      const order = handleTransakRedirect(navState.url, this.props.network);
      this.addTokenToTokensController(order.cryptocurrency, this.props.network);
      this.props.addOrder(order);
      this.props.protectWalletModalVisible();
      this.props.navigation.dangerouslyGetParent()?.pop();
      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_SUBMITTED_LEGACY,
          {
            fiat_amount: { value: order.amount, anonymous: true },
            fiat_currency: { value: order.currency, anonymous: true },
            crypto_currency: { value: order.cryptocurrency, anonymous: true },
            crypto_amount: { value: order.cryptoAmount, anonymous: true },
            fee_in_fiat: { value: order.fee, anonymous: true },
            fee_in_crypto: { value: order.cryptoFee, anonymous: true },
            fiat_amount_in_usd: { value: order.amountInUSD, anonymous: true },
            order_id: { value: order.id, anonymous: true },
            'on-ramp_provider': {
              value: FIAT_ORDER_PROVIDERS.TRANSAK,
              anonymous: true,
            },
          },
        );
        NotificationManager.showSimpleNotification(
          getNotificationDetails(order),
        );
      });
    }
  };

  render() {
    const uri = this.props.route.params?.url;
    if (uri) {
      return (
        <View style={baseStyles.flexGrow}>
          <WebView
            source={{ uri }}
            onNavigationStateChange={this.handleNavigationStateChange}
            allowInlineMediaPlayback
            enableApplePay
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      );
    }
  }
}

TransakWebView.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  network: state.engine.backgroundState.NetworkController.network,
});

const mapDispatchToProps = (dispatch) => ({
  addOrder: (order) => dispatch(addFiatOrder(order)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(TransakWebView);
