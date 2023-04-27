import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, ScrollView, InteractionManager } from 'react-native';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingLeft: 18,
      zIndex: 99999999999999,
    },
  });

/**
 * Main view for app configurations
 */
class Settings extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getClosableNavigationOptions(
        strings('app_settings.title'),
        strings('navigation.close'),
        navigation,
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

  onPressGeneral = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.SETTINGS_GENERAL),
    );
    this.props.navigation.navigate('GeneralSettings');
  };

  onPressAdvanced = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.SETTINGS_ADVANCED),
    );
    this.props.navigation.navigate('AdvancedSettings');
  };

  onPressSecurity = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.SETTINGS_SECURITY_AND_PRIVACY),
    );
    this.props.navigation.navigate('SecuritySettings');
  };

  onPressNetworks = () => {
    this.props.navigation.navigate('NetworksSettings');
  };

  onPressOnRamp = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.ONRAMP_SETTINGS_CLICKED),
    );
    this.props.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.SETTINGS);
  };

  onPressExperimental = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.SETTINGS_EXPERIMENTAL),
    );
    this.props.navigation.navigate('ExperimentalSettings');
  };

  onPressInfo = () => {
    InteractionManager.runAfterInteractions(() =>
      Analytics.trackEvent(MetaMetricsEvents.SETTINGS_ABOUT),
    );
    this.props.navigation.navigate('CompanySettings');
  };

  onPressContacts = () => {
    this.props.navigation.navigate('ContactsSettings');
  };

  render = () => {
    const { seedphraseBackedUp } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <ScrollView style={styles.wrapper}>
        <SettingsDrawer
          description={strings('app_settings.general_desc')}
          onPress={this.onPressGeneral}
          title={strings('app_settings.general_title')}
        />
        <SettingsDrawer
          description={strings('app_settings.security_desc')}
          onPress={this.onPressSecurity}
          title={strings('app_settings.security_title')}
          warning={!seedphraseBackedUp}
        />
        <SettingsDrawer
          description={strings('app_settings.advanced_desc')}
          onPress={this.onPressAdvanced}
          title={strings('app_settings.advanced_title')}
        />
        <SettingsDrawer
          description={strings('app_settings.contacts_desc')}
          onPress={this.onPressContacts}
          title={strings('app_settings.contacts_title')}
        />
        <SettingsDrawer
          title={strings('app_settings.networks_title')}
          description={strings('app_settings.networks_desc')}
          onPress={this.onPressNetworks}
        />
        <SettingsDrawer
          title={strings('app_settings.fiat_on_ramp.title')}
          description={strings('app_settings.fiat_on_ramp.description')}
          onPress={this.onPressOnRamp}
        />
        <SettingsDrawer
          title={strings('app_settings.experimental_title')}
          description={strings('app_settings.experimental_desc')}
          onPress={this.onPressExperimental}
        />
        <SettingsDrawer
          title={strings('app_settings.info_title')}
          onPress={this.onPressInfo}
        />
      </ScrollView>
    );
  };
}

Settings.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  seedphraseBackedUp: state.user.seedphraseBackedUp,
});

export default connect(mapStateToProps)(Settings);
