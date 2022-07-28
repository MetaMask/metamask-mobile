import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { getSendFlowTitle } from '../../UI/Navbar';
import { baseStyles } from '../../../styles/common';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import BrowserTab from '../BrowserTab';
import Text from '../../../components/Base/Text';
import StyledButton from '../../../components/UI/StyledButton';
import { strings } from '../../../../locales/i18n';

const createStyles = () =>
  StyleSheet.create({
    hidden: {
      height: 0,
      maxHeight: 0,
      width: 0,
      maxWidth: 0,
    },
    experimentalContainer: {
      padding: 30,
    },
    experimentalTitle: {
      marginTop: 30,
      fontSize: 32,
      textAlign: 'center',
    },
    experimentalText: {
      marginTop: 60,
      marginBottom: 40,
      textAlign: 'center',
    },
    widgetContainer: {
      flexGrow: 1,
    },
  });

const WidgetWebview = ({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles();

  const [experimentalNext, setExperimentalNext] = useState<boolean>(false);

  useEffect(() => {
    navigation.setOptions(
      getSendFlowTitle('create_my_nft.title', navigation, route, colors),
    );
  }, [colors, navigation, route]);

  const uri = route.params?.url;
  const experimental = route.params?.experimental;

  return (
    <View style={styles.widgetContainer}>
      {uri ? (
        <View
          style={[
            baseStyles.flexGrow,
            experimental && !experimentalNext && styles.hidden,
          ]}
        >
          <BrowserTab
            isAlwaysActive
            allowAllAccounts
            initialUrl={uri}
            updateTabInfo={() => null}
            showTabs={() => null}
            newTab={() => null}
          />
        </View>
      ) : null}

      {experimental && !experimentalNext ? (
        <View style={styles.experimentalContainer}>
          <Text bold style={styles.experimentalTitle}>
            {strings('widget_webview.experimental_title')}
          </Text>
          <Text big style={styles.experimentalText}>
            {strings('widget_webview.experimental_question')}
          </Text>
          <StyledButton
            type={'confirm'}
            onPress={() => setExperimentalNext(true)}
            testID={'widget-experimental-button'}
          >
            {strings('widget_webview.experimental_continue')}
          </StyledButton>
        </View>
      ) : null}
    </View>
  );
};

WidgetWebview.propTypes = {
  /**
   * react-navigation object used to switch between screens
   */
  navigation: PropTypes.object,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
};

export default WidgetWebview;
