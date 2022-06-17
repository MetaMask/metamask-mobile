import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View, InteractionManager, Platform, Linking } from 'react-native';
import { connect } from 'react-redux';
import { WebView } from 'react-native-webview';
import NotificationManager from '../../../../core/NotificationManager';
import { sardineCallbackOrderToFiatOrder } from '../orderProcessor/sardine';
import { getNotificationDetails } from '..';

import { getTransakWebviewNavbar } from '../../Navbar';
import { baseStyles } from '../../../../styles/common';
import { protectWalletModalVisible } from '../../../../actions/user';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import AnalyticsV2 from '../../../../util/analyticsV2';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
  NETWORK_ALLOWED_TOKENS,
  NETWORK_NATIVE_SYMBOL,
  PAYMENT_CATEGORY,
  PAYMENT_RAILS,
} from '../../../../constants/on-ramp';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import { ThemeContext, mockTheme } from '../../../../util/theme';

class SardineWebView extends PureComponent {
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
                'on-ramp_provider': FIAT_ORDER_PROVIDERS.SARDINE,
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

  handleOrderStatus = async (orderData, isSuccess) => {
    if (isSuccess && orderData) {
      const order = sardineCallbackOrderToFiatOrder(orderData);
      this.addTokenToTokensController(order.cryptocurrency, this.props.network);
      this.props.addOrder(order);
      this.props.protectWalletModalVisible();
      this.props.navigation.dangerouslyGetParent()?.pop();
      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_SUBMITTED,
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
              value: FIAT_ORDER_PROVIDERS.SARDINE,
              anonymous: true,
            },
          },
        );
        NotificationManager.showSimpleNotification(
          getNotificationDetails(order),
        );
      });
    } else {
      this.props.protectWalletModalVisible();
      this.props.navigation.dangerouslyGetParent()?.pop();

      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_FAILED,
          {
            'on-ramp_provider': {
              value: FIAT_ORDER_PROVIDERS.SARDINE,
              anonymous: true,
            },
          },
        );

        const order = {
          status: FIAT_ORDER_STATES.FAILED,
        };
        NotificationManager.showSimpleNotification(
          getNotificationDetails(order),
        );
      });
    }
  };

  onContentProcessDidTerminate = () => this.webView.reload();

  render() {
    const uri = this.props.route.params?.url;
    const userAgent =
      'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004; Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36';
    const javaScriptFunction = `
			document.addEventListener('order-success', function(data) {
				const d = {
					success: true,
					data: data.detail,
				};

				const v = JSON.stringify(d);
				window.ReactNativeWebView && window.ReactNativeWebView.postMessage(v);
			});

			document.addEventListener('order-fail', function() {
				const d = {
					success: false,
				};
				const v = JSON.stringify(d);

				window.ReactNativeWebView && window.ReactNativeWebView.postMessage(v);
			});

			document.addEventListener('sardine-external-links', function(data) {
				const d = {
					url: data.detail,
				};
				const v = JSON.stringify(d);

				window.ReactNativeWebView && window.ReactNativeWebView.postMessage(v);
			});
		`;

    if (uri) {
      return (
        <View style={baseStyles.flexGrow}>
          <WebView
            ref={(webView) => (this.webView = webView)}
            source={{ uri }}
            onContentProcessDidTerminate={this.onContentProcessDidTerminate}
            geolocationEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            useWebKit={true}
            allowsInlineMediaPlayback={true}
            javaScriptEnabledAndroid={true}
            injectedJavaScript={javaScriptFunction}
            userAgent={userAgent}
            onMessage={(event) => {
              const eventData = JSON.parse(event.nativeEvent.data);

              if (eventData) {
                const orderData = eventData.data;
                const externalLink = eventData.url;
                const orderSuccess = eventData.success;

                if (externalLink) {
                  Linking.canOpenURL(externalLink).then((canOpen) => {
                    if (canOpen) {
                      Linking.openURL(externalLink);
                    }
                  });
                } else if(orderSuccess) {
                  setTimeout(() => {
                    this.handleOrderStatus(orderData, orderSuccess);
                  }, 2000);
                }
              }
            }}
          />
        </View>
      );
    }
  }
}

SardineWebView.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  network: state.engine.backgroundState.NetworkController.network,
});

const mapDispatchToProps = (dispatch) => ({
  addOrder: (order) => dispatch(addFiatOrder(order)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(SardineWebView);
