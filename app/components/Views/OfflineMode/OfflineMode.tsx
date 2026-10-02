import React, { useEffect } from 'react';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { ParamListBase, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import { getOfflineModalNavbar } from '../../UI/Navbar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';
import { getInfuraBlockedSelector } from '../../../reducers/infuraAvailability';
import noConnectionImage from '../../../images/no-connection-illustration.png';
import { OfflineModeSelectorsIDs } from './OfflineMode.testIds';

type OfflineModeProps = NativeStackScreenProps<ParamListBase, string>;

interface OfflineModeRouteParams {
  /** Pop the screen once connectivity returns (set when opened for network loss) */
  autoDismissOnReconnect?: boolean;
}

/**
 * Full-screen state shown when the device loses connectivity, or when Infura
 * is unavailable in the user's region.
 */
export const OfflineMode = ({ navigation, route }: OfflineModeProps) => {
  const tw = useTailwind();
  const infuraBlocked: boolean = useSelector(getInfuraBlockedSelector);

  const netinfo = NetInfo.useNetInfo();
  const isFocused = useIsFocused();
  const autoDismissOnReconnect = (
    route?.params as OfflineModeRouteParams | undefined
  )?.autoDismissOnReconnect;

  useEffect(() => {
    if (autoDismissOnReconnect === true && isFocused && netinfo?.isConnected) {
      navigation.pop();
    }
  }, [isFocused, navigation, netinfo?.isConnected, autoDismissOnReconnect]);

  const tryAgain = () => {
    if (netinfo?.isConnected) {
      navigation.pop();
    }
  };

  const learnMore = () => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: AppConstants.URLS.CONNECTIVITY_ISSUES },
    });
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={OfflineModeSelectorsIDs.CONTAINER}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={3}
        paddingHorizontal={4}
        twClassName="flex-1"
      >
        <Image
          source={noConnectionImage}
          resizeMode="contain"
          style={tw.style('w-40 h-40')}
        />
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          twClassName="text-center"
          testID={OfflineModeSelectorsIDs.TITLE}
        >
          {strings('offline_mode.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={OfflineModeSelectorsIDs.DESCRIPTION}
        >
          {strings(
            infuraBlocked
              ? 'offline_mode.text'
              : 'offline_mode.offline_description',
          )}
        </Text>
      </Box>
      <Box padding={4}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={infuraBlocked ? learnMore : tryAgain}
          testID={OfflineModeSelectorsIDs.ACTION_BUTTON}
        >
          {strings(
            `offline_mode.${infuraBlocked ? 'learn_more' : 'try_again'}`,
          )}
        </Button>
      </Box>
      {Device.isAndroid() && <AndroidBackHandler customBackPress={tryAgain} />}
    </SafeAreaView>
  );
};

OfflineMode.navigationOptions = getOfflineModalNavbar;

export default OfflineMode;
