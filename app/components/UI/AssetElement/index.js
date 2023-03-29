import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    arrow: {
      flex: 1,
      alignSelf: 'flex-end',
    },
    arrowIcon: {
      marginTop: 16,
    },
  });

/**
 * Customizable view to render assets in lists
 */
export default class AssetElement extends PureComponent {
  static propTypes = {
    /**
     * Content to display in the list element
     */
    children: PropTypes.node,
    /**
     * Object being rendered
     */
    asset: PropTypes.object,
    /**
     * Callback triggered on long press
     */
    onPress: PropTypes.func,
    /**
     * Callback triggered on long press
     */
    onLongPress: PropTypes.func,
  };

  handleOnPress = () => {
    const { onPress, asset } = this.props;
    onPress && onPress(asset);
  };

  handleOnLongPress = () => {
    const { onLongPress, asset } = this.props;
    onLongPress && onLongPress(asset);
  };

  render = () => {
    const { children } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const { asset } = this.props;

    return (
      <TouchableOpacity
        onPress={this.handleOnPress}
        onLongPress={this.handleOnLongPress}
        style={styles.itemWrapper}
        {...generateTestId(Platform, getAssetTestId(asset.symbol))}
      >
        {children}
        <View styles={styles.arrow}>
          <Icon
            name="ios-arrow-forward"
            size={24}
            color={colors.icon.alternative}
            style={styles.arrowIcon}
          />
        </View>
      </TouchableOpacity>
    );
  };
}

AssetElement.contextType = ThemeContext;
