import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
  Easing,
  Animated,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import RemoteImage from '../../Base/RemoteImage';
import StyledButton from '../../UI/StyledButton';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import AntIcons from 'react-native-vector-icons/AntDesign';
import Device from '../../../util/device';
import { renderShortText } from '../../../util/general';
import { toLocaleDate } from '../../../util/date';
import { renderFromWei } from '../../../util/number';
import { renderShortAddress } from '../../../util/address';
import { isMainNet } from '../../../util/networks';
import { isLinkSafe } from '../../../util/linkCheck';
import etherscanLink from '@metamask/etherscan-link';
import {
  addFavoriteCollectible,
  removeFavoriteCollectible,
} from '../../../actions/collectibles';
import { isCollectibleInFavoritesSelector } from '../../../reducers/collectibles';
import Share from 'react-native-share';
import {
  PanGestureHandler,
  gestureHandlerRootHOC,
  ScrollView,
} from 'react-native-gesture-handler';
import AppConstants from '../../../core/AppConstants';
import { useTheme } from '../../../util/theme';
import { selectChainId } from '../../../selectors/networkController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';

const ANIMATION_VELOCITY = 250;
const HAS_NOTCH = Device.hasNotch();
const ANIMATION_OFFSET = HAS_NOTCH ? 30 : 50;
const IS_SMALL_DEVICE = Device.isSmallDevice();
const VERTICAL_ALIGNMENT = IS_SMALL_DEVICE ? 12 : 16;

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 0,
      backgroundColor: colors.background.default,
      borderTopEndRadius: 8,
      borderTopStartRadius: 8,
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
    userContainer: {
      flexDirection: 'row',
      paddingBottom: 16,
    },
    userImage: {
      width: 38,
      height: 38,
      borderRadius: 100,
      marginRight: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      marginTop: VERTICAL_ALIGNMENT,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    iconButtons: {
      width: 54,
      height: 54,
    },
    leftButton: {
      marginRight: 16,
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
    userInfoContainer: {
      justifyContent: 'center',
    },
    titleWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: VERTICAL_ALIGNMENT,
    },
    dragger: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
    },
    scrollableDescription: {
      maxHeight: Device.getDeviceHeight() / 5,
    },
    description: {
      marginTop: 8,
    },
  });

const FieldType = {
  Link: 'Link',
  Text: 'Text',
};
/**
 * View that displays the information of a specific ERC-721 Token
 */
const CollectibleOverview = ({
  chainId,
  collectible,
  selectedAddress,
  tradable,
  onSend,
  addFavoriteCollectible,
  removeFavoriteCollectible,
  isInFavorites,
  openLink,
  onTranslation,
}) => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [position, setPosition] = useState(0);
  const positionAnimated = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const translationHeight = useMemo(
    () => wrapperHeight - headerHeight - ANIMATION_OFFSET,
    [headerHeight, wrapperHeight],
  );
  const animating = useRef(false);

  const renderScrollableDescription = useMemo(() => {
    const maxLength = IS_SMALL_DEVICE ? 150 : 300;
    return collectible?.description?.length > maxLength;
  }, [collectible.description]);

  const renderCollectibleInfoRow = useCallback(
    ({ key, value, onPress, type }) => {
      if (!value) return null;
      if (type === FieldType.Link) {
        if (!isLinkSafe(value)) return null;
      }
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
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_token_standard'),
      value: collectible?.standard,
      type: FieldType.Text,
    }),
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_last_sold'),
      value:
        collectible?.lastSale?.event_timestamp &&
        toLocaleDate(
          new Date(collectible?.lastSale?.event_timestamp),
        ).toString(),
      type: FieldType.Text,
    }),
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_last_price_sold'),
      value:
        collectible?.lastSale?.total_price &&
        `${renderFromWei(collectible?.lastSale?.total_price)} ETH`,
      type: FieldType.Text,
    }),
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_source'),
      value: collectible?.imageOriginal,
      onPress: () => openLink(collectible?.imageOriginal),
      type: FieldType.Link,
    }),
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_link'),
      value: collectible?.externalLink,
      onPress: () => openLink(collectible?.externalLink),
      type: FieldType.Link,
    }),
    renderCollectibleInfoRow({
      key: strings('collectible.collectible_asset_contract'),
      value: renderShortAddress(collectible?.address),
      onPress: () => {
        if (isMainNet(chainId))
          openLink(
            etherscanLink.createTokenTrackerLink(collectible?.address, chainId),
          );
      },
      type: FieldType.Text,
    }),
  ];

  const collectibleToFavorites = useCallback(() => {
    const action = isInFavorites
      ? removeFavoriteCollectible
      : addFavoriteCollectible;
    action(selectedAddress, chainId, collectible);
  }, [
    selectedAddress,
    chainId,
    collectible,
    isInFavorites,
    addFavoriteCollectible,
    removeFavoriteCollectible,
  ]);

  const shareCollectible = useCallback(() => {
    if (!collectible?.externalLink) return;
    Share.open({
      message: `${strings('collectible.share_check_out_nft')} ${
        collectible.externalLink
      }\n${strings('collectible.share_via')} ${
        AppConstants.SHORT_HOMEPAGE_URL
      }`,
    });
  }, [collectible.externalLink]);

  const onHeaderLayout = useCallback(
    ({
      nativeEvent: {
        layout: { height },
      },
    }) => headerHeight === 0 && setHeaderHeight(height),
    [headerHeight],
  );

  const onWrapperLayout = useCallback(
    ({
      nativeEvent: {
        layout: { height },
      },
    }) => wrapperHeight === 0 && setWrapperHeight(height),
    [wrapperHeight],
  );

  const animateViewPosition = useCallback(
    (toValue, duration) => {
      animating.current = true;
      Animated.timing(positionAnimated, {
        toValue,
        duration,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        setPosition(toValue);
        animating.current = false;
      });
    },
    [positionAnimated],
  );

  const handleGesture = useCallback(
    (evt) => {
      // we don't want to trigger the animation again when the view is being animated
      if (evt.nativeEvent.velocityY === 0 || animating.current) return;
      const toValue = evt.nativeEvent.velocityY > 0 ? translationHeight : 0;
      if (toValue !== position) {
        onTranslation(toValue !== 0);
        animateViewPosition(toValue, ANIMATION_VELOCITY);
      }
    },
    [translationHeight, position, onTranslation, animateViewPosition],
  );

  const gestureHandlerWrapper = useCallback(
    (child) => (
      <PanGestureHandler
        waitFor={scrollViewRef}
        activeOffsetY={[0, 0]}
        activeOffsetX={[0, 0]}
        onGestureEvent={handleGesture}
      >
        {child}
      </PanGestureHandler>
    ),
    [handleGesture, scrollViewRef],
  );

  useEffect(() => {
    if (headerHeight !== 0 && wrapperHeight !== 0) {
      animateViewPosition(translationHeight, 0);
    }
  }, [headerHeight, wrapperHeight, translationHeight, animateViewPosition]);

  return gestureHandlerWrapper(
    <Animated.View
      onLayout={onWrapperLayout}
      style={[
        styles.wrapper,
        { transform: [{ translateY: positionAnimated }] },
      ]}
    >
      <View style={styles.titleWrapper}>
        <View style={styles.dragger} />
      </View>

      <SafeAreaView>
        <View onLayout={onHeaderLayout}>
          <View style={styles.generalContainer}>
            {collectible?.creator && (
              <View style={styles.userContainer}>
                <RemoteImage
                  fadeIn
                  placeholderStyle={{
                    backgroundColor: colors.background.alternative,
                  }}
                  source={{ uri: collectible.creator.profile_img_url }}
                  style={styles.userImage}
                />
                <View numberOfLines={1} style={styles.userInfoContainer}>
                  {collectible.creator.user?.username && (
                    <Text black bold noMargin big={!IS_SMALL_DEVICE}>
                      {collectible.creator.user.username}
                    </Text>
                  )}
                  <Text numberOfLines={1} black noMargin small>
                    {collectible.contractName}
                  </Text>
                </View>
              </View>
            )}
            <Text numberOfLines={2} bold primary noMargin style={styles.name}>
              {collectible.name}
            </Text>
            <Text primary noMargin big>
              {strings('unit.token_id')}
              {renderShortText(collectible.tokenId, 8)}
            </Text>
          </View>

          <View style={[styles.generalContainer, styles.buttonContainer]}>
            {tradable && (
              <StyledButton
                onPressOut={onSend}
                type={'rounded-normal'}
                containerStyle={[
                  baseStyles.flexGrow,
                  styles.button,
                  styles.leftButton,
                ]}
              >
                <Text link big={!IS_SMALL_DEVICE} bold noMargin>
                  {strings('asset_overview.send_button')}
                </Text>
              </StyledButton>
            )}
            {collectible?.externalLink && (
              <StyledButton
                type={'rounded-normal'}
                containerStyle={[
                  styles.button,
                  styles.iconButtons,
                  styles.leftButton,
                ]}
                onPressOut={shareCollectible}
              >
                <Text bold link noMargin>
                  <EvilIcons
                    name={Device.isIos() ? 'share-apple' : 'share-google'}
                    size={32}
                  />
                </Text>
              </StyledButton>
            )}
            <StyledButton
              type={'rounded-normal'}
              containerStyle={[styles.button, styles.iconButtons]}
              onPressOut={collectibleToFavorites}
            >
              <Text link noMargin>
                <AntIcons name={isInFavorites ? 'star' : 'staro'} size={24} />
              </Text>
            </StyledButton>
          </View>
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
                  ref={scrollViewRef}
                  bounces={false}
                  style={[styles.description, styles.scrollableDescription]}
                >
                  <TouchableWithoutFeedback>
                    <Text noMargin black style={styles.collectibleDescription}>
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
      </SafeAreaView>
    </Animated.View>,
  );
};

CollectibleOverview.propTypes = {
  /**
   * Chain id
   */
  chainId: PropTypes.string,
  /**
   * Object that represents the collectible to be displayed
   */
  collectible: PropTypes.object,
  /**
   * Represents if the collectible is tradable (can be sent)
   */
  tradable: PropTypes.bool,
  /**
   * Function called when user presses the Send button
   */
  onSend: PropTypes.func,
  /**
   * Selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Dispatch add collectible to favorites action
   */
  addFavoriteCollectible: PropTypes.func,
  /**
   * Dispatch remove collectible from favorites action
   */
  removeFavoriteCollectible: PropTypes.func,
  /**
   * Whether the current collectible is favorited
   */
  isInFavorites: PropTypes.bool,
  /**
   * Function to open a link on a webview
   */
  openLink: PropTypes.func.isRequired,
  /**
   * callback to trigger when modal is being animated
   */
  onTranslation: PropTypes.func,
};

const mapStateToProps = (state, props) => ({
  chainId: selectChainId(state),
  selectedAddress: selectSelectedAddress(state),
  isInFavorites: isCollectibleInFavoritesSelector(state, props.collectible),
});

const mapDispatchToProps = (dispatch) => ({
  addFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(addFavoriteCollectible(selectedAddress, chainId, collectible)),
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(
  Device.isIos()
    ? CollectibleOverview
    : gestureHandlerRootHOC(CollectibleOverview, {
        flex: 0,
        zIndex: 0,
        elevation: 0,
      }),
);
