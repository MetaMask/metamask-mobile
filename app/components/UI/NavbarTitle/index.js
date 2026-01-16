import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import Networks, { getDecimalChainId } from '../../../util/networks';
import { strings } from '../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { withNavigation } from '@react-navigation/compat';
import {
  selectChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import withMetricsAwareness from '../../../components/hooks/useMetrics/withMetricsAwareness';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { selectNetworkName } from '../../../selectors/networkInfos';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    network: {
      flexDirection: 'row',
      alignItems: 'center',
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
     * Name of the network to display
     */
    networkName: PropTypes.string,
    /**
     * Content to display inside text element
     */
    children: PropTypes.node,
    /**
     * Selected multichain chainId
     */
    chainId: PropTypes.string,
    /**
     * Selected network name
     */
    selectedNetworkName: PropTypes.string,
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
          this.props.metrics
            .createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
            .addProperties({
              chain_id: getDecimalChainId(this.props.chainId),
            })
            .build(),
        );
        setTimeout(() => {
          this.animating = false;
        }, 500);
      }
    }
  };

  render = () => {
    const {
      providerConfig,
      title,
      translate,
      showSelectedNetwork,
      children,
      networkName,
      selectedNetworkName,
    } = this.props;
    let name = null;

    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (selectedNetworkName || networkName) {
      name = networkName || selectedNetworkName;
      // TODO: [SOLANA] Revisit this before shipping, some screens do not pass a network name as a prop, consider using the selector instead
    } else if (providerConfig.nickname) {
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
          <Text numberOfLines={1} variant={TextVariant.HeadingSM}>
            {realTitle}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text variant={TextVariant.BodyMDBold}>{strings(children)}</Text>
        ) : (
          children
        )}
        {showSelectedNetwork ? (
          <View style={styles.network}>
            <Text
              numberOfLines={1}
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
            >
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
  chainId: selectChainId(state),
  selectedNetworkName: selectNetworkName(state),
});

export default withNavigation(
  connect(mapStateToProps)(withMetricsAwareness(NavbarTitle)),
);
