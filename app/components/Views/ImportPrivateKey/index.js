import React, { PureComponent } from 'react';
import {
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Text,
  View,
  Platform,
} from 'react-native';

import PropTypes from 'prop-types';
import StyledButton from '../../UI/StyledButton';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import Icon from 'react-native-vector-icons/Feather';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { importAccountFromPrivateKey } from '../../../util/address';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { createStyles } from './styles';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_ACCOUNT_SCREEN_ID,
  IMPORT_PRIVATE_KEY_BUTTON_ID,
  PRIVATE_KEY_INPUT_BOX_ID,
  CLOSE_BUTTON_ON_IMPORT_ACCOUNT_SCREEN_ID,
} from '../../../../wdio/features/testIDs/Screens/ImportAccountScreen.testIds';

/**
 * View that's displayed the first time a user receives funds
 */
export default class ImportPrivateKey extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
  };

  state = {
    privateKey: '',
    loading: false,
    inputWidth: Device.isAndroid() ? '99%' : undefined,
  };

  componentDidMount = () => {
    this.mounted = true;
    // Workaround https://github.com/facebook/react-native/issues/9958
    this.state.inputWidth &&
      setTimeout(() => {
        this.mounted && this.setState({ inputWidth: '100%' });
      }, 100);
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  goNext = async () => {
    if (this.state.privateKey === '') {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_empty_message'),
      );
      this.setState({ loading: false });
      return;
    }

    this.setState({ loading: true });
    // Import private key
    try {
      await importAccountFromPrivateKey(this.state.privateKey);
      this.props.navigation.navigate('ImportPrivateKeySuccess');
      this.setState({ loading: false, privateKey: '' });
    } catch (e) {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_message'),
      );
      this.setState({ loading: false });
    }
  };

  learnMore = () =>
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://metamask.zendesk.com/hc/en-us/articles/360015289932-What-are-imported-accounts-',
        title: strings('drawer.metamask_support'),
      },
    });

  onInputChange = (value) => {
    this.setState({ privateKey: value });
  };

  dismiss = () => {
    this.props.navigation.goBack(null);
  };

  scanPkey = () => {
    this.props.navigation.navigate('QRScanner', {
      onScanSuccess: (data) => {
        if (data.private_key) {
          this.setState({ privateKey: data.private_key }, () => {
            this.goNext();
          });
        } else {
          Alert.alert(
            strings('import_private_key.error_title'),
            strings('import_private_key.error_message'),
          );
        }
      },
    });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <View style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.wrapper}
          style={styles.topOverlay}
          testID={'first-incoming-transaction-screen'}
          resetScrollToCoords={{ x: 0, y: 0 }}
        >
          <View
            style={styles.content}
            {...generateTestId(Platform, IMPORT_ACCOUNT_SCREEN_ID)}
          >
            <TouchableOpacity
              onPress={this.dismiss}
              style={styles.navbarRightButton}
            >
              <MaterialIcon
                name="close"
                size={15}
                style={styles.closeIcon}
                {...generateTestId(
                  Platform,
                  CLOSE_BUTTON_ON_IMPORT_ACCOUNT_SCREEN_ID,
                )}
              />
            </TouchableOpacity>
            <View style={styles.top}>
              <Icon name="download" style={styles.icon} />
              <Text style={styles.title}>
                {strings('import_private_key.title')}
              </Text>
              <View style={styles.dataRow}>
                <Text style={styles.label}>
                  {strings('import_private_key.description_one')}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label} onPress={this.learnMore}>
                  {strings('import_private_key.learn_more_here')}
                </Text>
              </View>
            </View>
            <View style={styles.bottom}>
              <View style={styles.subtitleText}>
                <Text style={styles.subtitleText}>
                  {strings('import_private_key.subtitle')}
                </Text>
              </View>
              <TextInput
                value={this.state.privateKey}
                numberOfLines={3}
                multiline
                style={[
                  styles.input,
                  this.state.inputWidth ? { width: this.state.inputWidth } : {},
                ]}
                onChangeText={this.onInputChange}
                {...generateTestId(Platform, PRIVATE_KEY_INPUT_BOX_ID)}
                blurOnSubmit
                onSubmitEditing={this.goNext}
                returnKeyType={'next'}
                placeholder={strings('import_private_key.example')}
                placeholderTextColor={colors.text.muted}
                autoCapitalize={'none'}
                keyboardAppearance={themeAppearance}
              />
              <View style={styles.scanPkeyRow}>
                <TouchableOpacity
                  onPress={this.scanPkey}
                  style={styles.scanPkey}
                >
                  <Text style={styles.scanPkeyText}>
                    {strings('import_private_key.or_scan_a_qr_code')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.buttonWrapper}>
            <StyledButton
              containerStyle={styles.button}
              type={'confirm'}
              onPress={this.goNext}
              {...generateTestId(Platform, IMPORT_PRIVATE_KEY_BUTTON_ID)}
            >
              {this.state.loading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary.inverse}
                />
              ) : (
                strings('import_private_key.cta_text')
              )}
            </StyledButton>
          </View>
        </KeyboardAwareScrollView>
        <ScreenshotDeterrent enabled isSRP={false} />
      </View>
    );
  }
}

ImportPrivateKey.contextType = ThemeContext;
