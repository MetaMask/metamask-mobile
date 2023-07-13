import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { scale } from 'react-native-size-matters';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Networks from '../../../util/networks';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { NAVBAR_TITLE_NETWORKS_TEXT } from '../../../../wdio/screen-objects/testIDs/Screens/WalletScreen-testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Analytics from '../../../core/Analytics/Analytics';
import { withNavigation } from '@react-navigation/compat';
import { selectProviderConfig } from '../../../selectors/networkController';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    network: {
      flexDirection: 'row',
    },
    networkName: {
      fontSize: 11,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    networkIcon: {
      width: 5,
      height: 5,
      borderRadius: 100,
      marginRight: 5,
      marginTop: Device.isIos() ? 4 : 5,
    },
    title: {
      fontSize: scale(14),
      ...fontStyles.normal,
      color: colors.text.default,
    },
    otherNetworkIcon: {
      backgroundColor: importedColors.transparent,
      borderColor: colors.border.default,
      borderWidth: 1,
    },
  });

/**
 * UI PureComponent that renders inside the navbar
 * showing the view title and the selected network
 */
class NavbarTitle extends PureComponent {
  static propTypes = {
    /**
     * Object representing the configuration of the current selected network
     */
    providerConfig: PropTypes.object.isRequired,
    /**
     * Name of the current view
     */
    title: PropTypes.string,
    /**
     * Boolean that specifies if the title needs translation
     */
    translate: PropTypes.bool,
    /**
     * Boolean that specifies if the network can be changed
     */
    disableNetwork: PropTypes.bool,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
  };

  static defaultProps = {
    translate: true,
  };

  animating = false;

  openNetworkList = () => {
    if (!this.props.disableNetwork) {
      if (!this.animating) {
        this.animating = true;
        this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.NETWORK_SELECTOR,
        });

        Analytics.trackEventWithParameters(
          MetaMetricsEvents.NETWORK_SELECTOR_PRESSED,
          {
            chain_id: this.props.providerConfig.chainId,
          },
        );
        setTimeout(() => {
          this.animating = false;
        }, 500);
      }
    }
  };

  render = () => {
    const { providerConfig, title, translate } = this.props;
    let name = null;
    const color =
      (Networks[providerConfig.type] && Networks[providerConfig.type].color) ||
      null;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (providerConfig.nickname) {
      name = providerConfig.nickname;
    } else {
      name =
        (Networks[providerConfig.type] && Networks[providerConfig.type].name) ||
        { ...Networks.rpc, color: null }.name;
    }

    const realTitle = translate ? strings(title) : title;

    return (
      <TouchableOpacity
        onPress={this.openNetworkList}
        style={styles.wrapper}
        activeOpacity={this.props.disableNetwork ? 1 : 0.2}
        testID={'navbar-title-text'}
      >
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {realTitle}
          </Text>
        ) : null}
        <View style={styles.network}>
          <View
            style={[
              styles.networkIcon,
              color ? { backgroundColor: color } : styles.otherNetworkIcon,
            ]}
          />
          <Text
            numberOfLines={1}
            style={styles.networkName}
            {...generateTestId(Platform, NAVBAR_TITLE_NETWORKS_TEXT)}
          >
            {name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
}

NavbarTitle.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
});

export default withNavigation(connect(mapStateToProps)(NavbarTitle));
