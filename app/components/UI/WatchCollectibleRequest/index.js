import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, InteractionManager } from 'react-native';
import { baseStyles, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import ActionView from '../ActionView';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import URL from 'url-parse';
import AnalyticsV2 from '../../../util/analyticsV2';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import NotificationManager from '../../../core/NotificationManager';
import { renderShortText } from '../../../util/general';
import {
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import { renderShortAddress } from '../../../util/address';
import Text from '../../../components/Base/Text';
import CollectibleMedia from '../CollectibleMedia';

const HAS_NOTCH = Device.hasNotch();
const IS_SMALL_DEVICE = Device.isSmallDevice();
const VERTICAL_ALIGNMENT = IS_SMALL_DEVICE ? 12 : 16;

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      minHeight: '90%',
    },
    title: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 20,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    generalContainer: {
      paddingHorizontal: 16,
    },
    information: {
      paddingTop: HAS_NOTCH ? 24 : VERTICAL_ALIGNMENT,
    },
    row: {
      paddingVertical: 6,
    },
    name: {
      fontSize: Device.isSmallDevice() ? 16 : 24,
      marginBottom: 3,
    },
    collectibleInfoContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
    },
    collectibleInfoKey: {
      paddingRight: 10,
    },
    collectibleDescription: {
      lineHeight: 22,
    },
    titleWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: VERTICAL_ALIGNMENT,
    },
    scrollableDescription: {
      maxHeight: Device.getDeviceHeight() / 5,
    },
    description: {
      marginTop: 8,
    },
    round: {
      borderRadius: 12,
    },
    media: {
      alignItems: 'center',
      marginBottom: 30,
    },
  });

const WatchCollectibleRequest = ({
  suggestedCollectibleMeta,
  currentPageInformation,
  onCancel,
  onConfirm,
}) => {
  const { collectible } = suggestedCollectibleMeta;
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  useEffect(
    () => async () => {
      const { CollectiblesController } = Engine.context;
      typeof suggestedCollectibleMeta !== undefined &&
        (await CollectiblesController.rejectWatchCollectible(
          suggestedCollectibleMeta.id,
        ));
    },
    [suggestedCollectibleMeta],
  );

  const getAnalyticsParams = () => {
    try {
      const { NetworkController } = Engine.context;
      const { chainId, type } = NetworkController?.state?.provider || {};
      const url = new URL(currentPageInformation?.url);

      return {
        address: collectible?.address,
        token_id: collectible?.symbol,
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        network_name: type,
        chain_id: chainId,
        source: 'Dapp suggested (watchCollectible)',
      };
    } catch (error) {
      return {};
    }
  };

  const onConfirmPress = async () => {
    const { CollectiblesController } = Engine.context;
    await CollectiblesController.acceptWatchCollectible(
      suggestedCollectibleMeta.id,
    );
    onConfirm && onConfirm();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.TOKEN_ADDED,
        getAnalyticsParams(),
      );
      NotificationManager.showSimpleNotification({
        status: `simple_notification`,
        duration: 5000,
        title: strings('wallet.token_toast.token_imported_title'),
        description: strings('wallet.token_toast.token_imported_desc', {
          tokenSymbol: collectible?.address || '---',
        }),
      });
    });
  };

  const renderScrollableDescription = useMemo(() => {
    const maxLength = IS_SMALL_DEVICE ? 150 : 300;
    return collectible?.description?.length > maxLength;
  }, [collectible.description]);

  const renderCollectibleInfoRow = useCallback(
    (key, value, onPress) => {
      if (!value) return null;
      return (
        <View style={styles.collectibleInfoContainer} key={key}>
          <Text
            noMargin
            black
            bold
            big={!IS_SMALL_DEVICE}
            style={styles.collectibleInfoKey}
          >
            {key}
          </Text>
          <Text
            noMargin
            big={!IS_SMALL_DEVICE}
            link={!!onPress}
            black={!onPress}
            right
            style={baseStyles.flexGrow}
            numberOfLines={1}
            ellipsizeMode="middle"
            onPress={onPress}
          >
            {value}
          </Text>
        </View>
      );
    },
    [styles],
  );

  const renderCollectibleInfo = () => [
    renderCollectibleInfoRow(
      strings('collectible.collectible_token_standard'),
      collectible?.standard,
    ),
    renderCollectibleInfoRow(
      strings('collectible.collectible_link'),
      collectible?.externalLink,
      () => null /*openLink(collectible?.externalLink)*/,
    ),
    renderCollectibleInfoRow(
      strings('collectible.collectible_asset_contract'),
      renderShortAddress(collectible?.address),
      () => {
        /*if (isMainNet(chainId))
          openLink(
            etherscanLink.createTokenTrackerLink(collectible?.address, chainId),
          );*/
      },
    ),
  ];

  return (
    <View style={styles.root}>
      <View style={styles.titleWrapper}>
        <Text style={styles.title} onPress={this.cancelSignature}>
          {strings('watch_collectible_request.message')}
        </Text>
      </View>
      <ActionView
        cancelTestID={'request-signature-cancel-button'}
        confirmTestID={'request-signature-confirm-button'}
        cancelText={strings('watch_collectible_request.cancel')}
        confirmText={strings('watch_collectible_request.add')}
        onCancelPress={onCancel}
        onConfirmPress={onConfirmPress}
      >
        <View>
          <View style={styles.generalContainer}>
            <View style={styles.media}>
              <CollectibleMedia
                big
                renderAnimation
                collectible={collectible}
                style={styles.round}
                hideMediaByDefault
              />
            </View>
            <Text numberOfLines={2} bold primary noMargin style={styles.name}>
              {collectible.name}
            </Text>
            <Text primary noMargin big>
              {strings('unit.token_id')}
              {renderShortText(collectible.tokenId, 8)}
            </Text>
          </View>

          {collectible?.description ? (
            <View style={styles.information}>
              <View style={[styles.generalContainer, styles.row]}>
                <View>
                  <Text noMargin black bold big={!IS_SMALL_DEVICE}>
                    {strings('collectible.collectible_description')}
                  </Text>
                </View>

                {renderScrollableDescription ? (
                  <ScrollView
                    bounces={false}
                    style={[styles.description, styles.scrollableDescription]}
                  >
                    <TouchableWithoutFeedback>
                      <Text
                        noMargin
                        black
                        style={styles.collectibleDescription}
                      >
                        {collectible.description}
                      </Text>
                    </TouchableWithoutFeedback>
                  </ScrollView>
                ) : (
                  <View style={styles.description}>
                    <Text noMargin black style={styles.collectibleDescription}>
                      {collectible.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View />
          )}

          {<View style={styles.information}>{renderCollectibleInfo()}</View>}
        </View>
      </ActionView>
    </View>
  );
};

WatchCollectibleRequest.propTypes = {
  /**
   * Callback triggered when this message signature is rejected
   */
  onCancel: PropTypes.func,
  /**
   * Callback triggered when this message signature is approved
   */
  onConfirm: PropTypes.func,
  /**
   * Collectible object
   */
  suggestedCollectibleMeta: PropTypes.object,
  /**
   * Object containing current page title, url, and icon href
   */
  currentPageInformation: PropTypes.object,
};

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
});

export default connect(mapStateToProps)(WatchCollectibleRequest);
