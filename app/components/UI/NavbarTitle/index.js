import { withNavigation } from '@react-navigation/compat';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { scale } from 'react-native-size-matters';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectProviderConfig } from '../../../selectors/networkController';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';
import Networks, { getDecimalChainId } from '../../../util/networks';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    network: {
      flexDirection: 'row',
      alignItems: 'center',
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
      marginTop: Device.isIos() ? 2 : 5,
    },
    title: {
      fontSize: scale(14),
      ...fontStyles.normal,
      color: colors.text.default,
    },
    children: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontWeight: 'bold',
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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Boolean that specifies if the network selected is displayed
     */
    showSelectedNetwork: PropTypes.bool,
    /**
     * Content to display inside text element
     */
    children: PropTypes.node,
  };

  static defaultProps = {
    translate: true,
    showSelectedNetwork: true,
  };

  animating = false;

  openNetworkList = () => {
    if (!this.props.disableNetwork) {
      if (!this.animating) {
        this.animating = true;
        this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.NETWORK_SELECTOR,
        });

        this.props.metrics.trackEvent(
          MetaMetricsEvents.NETWORK_SELECTOR_PRESSED,
          {
            chain_id: getDecimalChainId(this.props.providerConfig.chainId),
          },
        );
        setTimeout(() => {
          this.animating = false;
        }, 500);
      }
    }
  };

  render = () => {
    const { providerConfig, title, translate, showSelectedNetwork, children } =
      this.props;
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
      >
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {realTitle}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text variant={TextVariant.HeadingMD} style={styles.children}>
            {strings(children)}
          </Text>
        ) : (
          children
        )}
        {showSelectedNetwork ? (
          <View style={styles.network}>
            <View
              style={[
                styles.networkIcon,
                color ? { backgroundColor: color } : styles.otherNetworkIcon,
              ]}
            />
            <Text numberOfLines={1} style={styles.networkName}>
              {name}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };
}

NavbarTitle.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
});

export default withNavigation(
  connect(mapStateToProps)(withMetricsAwareness(NavbarTitle)),
);
