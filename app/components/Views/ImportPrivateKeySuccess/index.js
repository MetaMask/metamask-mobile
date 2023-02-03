import React, { PureComponent } from 'react';
import {
  TouchableOpacity,
  ScrollView,
  Text,
  View,
  StyleSheet,
  InteractionManager,
  BackHandler,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_SUCESS_SCREEN_ID,
  IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/ImportSuccessScreen.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      marginTop: 10,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
    },
    dataRow: {
      marginBottom: 10,
    },
    label: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    icon: {
      textAlign: 'left',
      fontSize: 90,
      marginTop: 0,
      marginLeft: 0,
    },
    top: {
      paddingTop: 0,
      padding: 30,
    },
    navbarRightButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
  });

/**
 * View that's displayed the first time imports account
 */
class ImportPrivateKeySuccess extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
  };

  componentDidMount = () => {
    InteractionManager.runAfterInteractions(() => {
      BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    });
  };

  componentWillUnmount = () => {
    InteractionManager.runAfterInteractions(() => {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        this.handleBackPress,
      );
    });
  };

  handleBackPress = () => {
    this.props.navigation.popToTop();
  };

  dismiss = () => {
    this.props.navigation.popToTop();
    this.props.navigation.goBack(null);
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.mainWrapper}>
        <ScrollView
          contentContainerStyle={styles.wrapper}
          style={styles.mainWrapper}
          testID={'first-incoming-transaction-screen'}
        >
          <View
            style={styles.content}
            {...generateTestId(Platform, IMPORT_SUCESS_SCREEN_ID)}
          >
            <TouchableOpacity
              onPress={this.dismiss}
              style={styles.navbarRightButton}
              {...generateTestId(
                Platform,
                IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID,
              )}
            >
              <MaterialIcon name="close" size={15} style={styles.closeIcon} />
            </TouchableOpacity>
            <View style={styles.top}>
              <Icon
                name="ios-checkmark-circle-outline"
                style={styles.icon}
                color={colors.success.default}
              />
              <Text style={styles.title}>
                {strings('import_private_key_success.title')}
              </Text>
              <View style={styles.dataRow}>
                <Text style={styles.label}>
                  {strings('import_private_key_success.description_one')}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <ScreenshotDeterrent enabled isSRP={false} />
      </View>
    );
  }
}

ImportPrivateKeySuccess.contextType = ThemeContext;

export default ImportPrivateKeySuccess;
