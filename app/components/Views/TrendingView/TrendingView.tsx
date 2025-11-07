import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { WebView } from '@metamask/react-native-webview';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { baseStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import { appendURLParams } from '../../../util/browser';
import { useMetrics } from '../../../components/hooks/useMetrics';

const TrendingView: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isEnabled } = useMetrics();

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: { security: { dataCollectionForMarketing?: boolean } }) =>
      state.security.dataCollectionForMarketing,
  );

  const handleBrowserPress = useCallback(() => {
    const portfolioUrl = appendURLParams(AppConstants.PORTFOLIO.URL, {
      metamaskEntry: 'mobile',
      metricsEnabled: isEnabled(),
      marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
    });

    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: portfolioUrl.href,
        timestamp: Date.now(),
        fromTrending: true,
      },
    });
  }, [navigation, isEnabled, isDataCollectionForMarketingEnabled]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: ${colors.background.default};
            color: ${colors.text.default};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          p {
            font-size: 16px;
            color: ${colors.text.muted};
            text-align: center;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <p>${strings('trending.coming_soon')}</p>
      </body>
    </html>
  `;

  return (
    <View style={[baseStyles.flexGrow, { paddingTop: insets.top }]}>
      <Box twClassName="flex-row justify-between items-center px-4 py-3 bg-default border-b border-muted">
        <Text variant={TextVariant.HeadingMd} twClassName="text-default">
          {strings('trending.title')}
        </Text>

        <Box flexDirection={BoxFlexDirection.Row}>
          <ButtonIcon
            iconName={IconName.Explore}
            size={ButtonIconSize.Lg}
            onPress={handleBrowserPress}
            testID="trending-view-browser-button"
          />
        </Box>
      </Box>
      <WebView
        containerStyle={baseStyles.webview}
        source={{ html: htmlContent }}
        testID="trending-view-webview"
      />
    </View>
  );
};

export default TrendingView;
