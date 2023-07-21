import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import URL from 'url-parse';
import { useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
import { renderFromTokenMinimalUnit } from '../../../util/number';
import TokenImage from '../../UI/TokenImage';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import useTokenBalance from '../../hooks/useTokenBalance';
import { useTheme } from '../../../util/theme';
import NotificationManager from '../../../core/NotificationManager';
import { selectChainId } from '../../../selectors/networkController';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      minHeight: Device.isIos() ? '50%' : '60%',
    },
    title: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 20,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    text: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 25,
      paddingHorizontal: 10,
      color: colors.text.default,
    },
    tokenInformation: {
      flexDirection: 'row',
      marginHorizontal: 40,
      flex: 1,
      alignItems: 'flex-start',
      marginVertical: 30,
    },
    tokenInfo: {
      flex: 1,
      flexDirection: 'column',
    },
    infoTitleWrapper: {
      alignItems: 'center',
    },
    infoTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
    },
    infoBalance: {
      alignItems: 'center',
    },
    infoToken: {
      alignItems: 'center',
    },
    token: {
      flexDirection: 'row',
    },
    identicon: {
      paddingVertical: 10,
    },
    signText: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
    addMessage: {
      flexDirection: 'row',
      margin: 20,
    },
    children: {
      alignItems: 'center',
      borderTopColor: colors.border.muted,
      borderTopWidth: 1,
    },
  });

const WatchAssetRequest = ({
  suggestedAssetMeta,
  currentPageInformation,
  onCancel,
  onConfirm,
}) => {
  const { asset, interactingAddress } = suggestedAssetMeta;
  // TODO - Once TokensController is updated, interactingAddress should always be defined
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [balance, , error] = useTokenBalance(asset.address, interactingAddress);
  const chainId = useSelector(selectChainId);
  const balanceWithSymbol = error
    ? strings('transaction.failed')
    : `${renderFromTokenMinimalUnit(balance, asset.decimals)} ${asset.symbol}`;

  const getAnalyticsParams = () => {
    try {
      const url = new URL(currentPageInformation?.url);

      return {
        token_address: asset?.address,
        token_symbol: asset?.symbol,
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        source: 'Dapp suggested (watchAsset)',
      };
    } catch (error) {
      return {};
    }
  };

  const onConfirmPress = async () => {
    await onConfirm();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.TOKEN_ADDED,
        getAnalyticsParams(),
      );
      NotificationManager.showSimpleNotification({
        status: `simple_notification`,
        duration: 5000,
        title: strings('wallet.token_toast.token_imported_title'),
        description: strings('wallet.token_toast.token_imported_desc', {
          tokenSymbol: asset?.symbol || '---',
        }),
      });
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleWrapper}>
        <Text style={styles.title} onPress={this.cancelSignature}>
          {strings('watch_asset_request.title')}
        </Text>
      </View>
      <ActionView
        cancelTestID={'request-signature-cancel-button'}
        confirmTestID={'request-signature-confirm-button'}
        cancelText={strings('watch_asset_request.cancel')}
        confirmText={strings('watch_asset_request.add')}
        onCancelPress={onCancel}
        onConfirmPress={onConfirmPress}
      >
        <View style={styles.children}>
          <View style={styles.addMessage}>
            <Text style={styles.signText}>
              {strings('watch_asset_request.message')}
            </Text>
          </View>

          <View style={styles.tokenInformation}>
            <View style={styles.tokenInfo}>
              <View style={styles.infoTitleWrapper}>
                <Text style={styles.infoTitle}>
                  {strings('watch_asset_request.token')}
                </Text>
              </View>

              <View style={styles.infoToken}>
                <View style={styles.token}>
                  <View style={styles.identicon}>
                    <TokenImage asset={asset} />
                  </View>
                  <Text style={styles.text}>{asset.symbol}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tokenInfo}>
              <View style={styles.infoTitleWrapper}>
                <Text style={styles.infoTitle}>
                  {strings('watch_asset_request.balance')}
                </Text>
              </View>

              <View style={styles.infoBalance}>
                <Text style={styles.text}>{balanceWithSymbol}</Text>
              </View>
            </View>
          </View>
        </View>
      </ActionView>
    </View>
  );
};

WatchAssetRequest.propTypes = {
  /**
   * Callback triggered when this message signature is rejected
   */
  onCancel: PropTypes.func,
  /**
   * Callback triggered when this message signature is approved
   */
  onConfirm: PropTypes.func,
  /**
   * Token object
   */
  suggestedAssetMeta: PropTypes.object,
  /**
   * Object containing current page title, url, and icon href
   */
  currentPageInformation: PropTypes.object,
};

export default WatchAssetRequest;
