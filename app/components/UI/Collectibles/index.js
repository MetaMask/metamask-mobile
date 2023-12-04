import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  ScrollView,
  RefreshControl,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ActionSheet from 'react-native-actionsheet';
import Engine from '../../../core/Engine';
import CollectibleMedia from '../CollectibleMedia';
import AssetElement from '../AssetElement';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    emptyView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
    },
    text: {
      fontSize: 20,
      color: colors.text.muted,
      ...fontStyles.normal,
    },
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
    },
    rows: {
      flex: 1,
      marginLeft: 20,
      marginTop: 6,
    },
    name: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    tokenId: {
      fontSize: 12,
      marginTop: 4,
      marginRight: 8,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
  });

/**
 * View that renders a list of Collectibles
 * also known as ERC-721 Tokens
 */
export default class Collectibles extends PureComponent {
  static propTypes = {
    /**
     * Navigation object required to push
     * the Asset detail view
     */
    navigation: PropTypes.object,
    /**
     * Array of assets (in this case Collectibles)
     */
    collectibles: PropTypes.array,
    /**
     * Collectible contract object
     */
    collectibleContract: PropTypes.object,
    /**
     * Callback triggered when collectible pressed from collectibles list
     */
    onPress: PropTypes.func,
  };

  state = {
    refreshing: false,
  };

  actionSheet = null;

  longPressedCollectible = null;

  renderEmpty = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <ScrollView
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={this.state.refreshing}
          />
        }
      >
        <View style={styles.emptyView}>
          <Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
        </View>
      </ScrollView>
    );
  };

  onItemPress = (collectible) => {
    this.props.navigation.navigate('CollectibleView', {
      ...collectible,
      contractName: this.props.collectibleContract.name,
    });
  };

  handleOnPress = (collectible) => {
    this.props.onPress(collectible);
  };

  goToAddCollectible = () => {
    this.props.navigation.push('AddAsset', { assetType: 'collectible' });
  };

  showRemoveMenu = (collectible) => {
    this.longPressedCollectible = collectible;
    this.actionSheet.show();
  };

  refreshMetadata = () => {
    const { NftController } = Engine.context;

    NftController.addNft(
      this.longPressedCollectible.current.address,
      this.longPressedCollectible.current.tokenId,
    );
  };

  handleMenuAction = (index) => {
    if (index === 1) {
      this.removeNft();
    } else if (index === 0) {
      this.refreshMetadata();
    }
  };

  removeNft = () => {
    const { NftController } = Engine.context;
    NftController.removeAndIgnoreNft(
      this.longPressedCollectible.address,
      this.longPressedCollectible.tokenId,
    );
    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  keyExtractor = (item) => `${item.address}_${item.tokenId}`;

  renderItem = ({ item }) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <AssetElement
        onPress={this.onItemPress}
        onLongPress={this.showRemoveMenu}
        asset={item}
      >
        <View style={styles.itemWrapper}>
          <CollectibleMedia small collectible={item} />
          <View style={styles.rows}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.tokenId} numberOfLines={1}>
              {strings('unit.token_id')}
              {item.tokenId}
            </Text>
          </View>
        </View>
      </AssetElement>
    );
  };

  renderCollectiblesList() {
    const { collectibles } = this.props;

    return (
      <FlatList
        data={collectibles}
        extraData={this.state}
        keyExtractor={this.keyExtractor}
        renderItem={this.renderItem}
      />
    );
  }

  render() {
    const { collectibles } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);

    return (
      <View style={styles.wrapper} testID={'collectibles'}>
        {collectibles && collectibles.length
          ? this.renderCollectiblesList()
          : this.renderEmpty()}
        <ActionSheet
          ref={this.createActionSheetRef}
          title={strings('wallet.collectible_action_title')}
          options={[
            strings('wallet.refresh_metadata'),
            strings('wallet.remove'),
            strings('wallet.cancel'),
          ]}
          cancelButtonIndex={2}
          destructiveButtonIndex={1}
          // eslint-disable-next-line react/jsx-no-bind
          onPress={this.handleMenuAction}
          theme={themeAppearance}
        />
      </View>
    );
  }
}

Collectibles.contextType = ThemeContext;
