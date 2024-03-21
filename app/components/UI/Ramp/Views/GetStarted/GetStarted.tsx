import React, { useCallback, useEffect } from 'react';
import { Image, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../components/ScreenLayout';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useRampSDK } from '../../sdk';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import Routes from '../../../../../constants/navigation/Routes';
import useAnalytics from '../../hooks/useAnalytics';
import useRampNetwork from '../../hooks/useRampNetwork';
import styles from './GetStarted.styles';
import useRegions from '../../hooks/useRegions';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const getStartedIcon = require('../../components/images/WalletInfo.png');

const GetStarted: React.FC = () => {
  const navigation = useNavigation();
  const { getStarted, setGetStarted, sdkError, selectedChainId, isBuy } =
    useRampSDK();
  const { selectedRegion } = useRegions();
  const [isNetworkRampSupported] = useRampNetwork();
  const trackEvent = useAnalytics();

  const { colors } = useTheme();

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Get Started Screen',
        chain_id_destination: selectedChainId,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Get Started Screen',
        chain_id_source: selectedChainId,
      });
    }
  }, [isBuy, selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.onboarding.what_to_expect'),
          showBack: false,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress]);

  const handleOnPress = useCallback(() => {
    trackEvent(
      isBuy ? 'ONRAMP_GET_STARTED_CLICKED' : 'OFFRAMP_GET_STARTED_CLICKED',
      {
        text: 'Get Started',
        location: 'Get Started Screen',
      },
    );
    setGetStarted(true);
  }, [isBuy, setGetStarted, trackEvent]);

  useEffect(() => {
    if (getStarted) {
      if (!isNetworkRampSupported) {
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.RAMP.NETWORK_SWITCHER }],
        });
        return;
      }
      if (selectedRegion) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.BUILD_QUOTE_HAS_STARTED,
              params: { showBack: false },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.RAMP.REGION_HAS_STARTED }],
        });
      }
    }
  }, [getStarted, isNetworkRampSupported, navigation, selectedRegion]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting
            error={sdkError}
            location={'Get Started Screen'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (getStarted) {
    // Avoid flashing the original content when the user has already seen it
    return <ScreenLayout />;
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenLayout.Content>
            <View style={styles.getStartedImageWrapper}>
              <Image source={getStartedIcon} />
            </View>
          </ScreenLayout.Content>
          <ScreenLayout.Content>
            <Text centered bold>
              {strings(
                isBuy
                  ? 'fiat_on_ramp_aggregator.onboarding.quotes'
                  : 'fiat_on_ramp_aggregator.onboarding.quotes_sell',
              )}
            </Text>
          </ScreenLayout.Content>
          <ScreenLayout.Content>
            <Text centered bold>
              {strings(
                isBuy
                  ? 'fiat_on_ramp_aggregator.onboarding.benefits'
                  : 'fiat_on_ramp_aggregator.onboarding.benefits_sell',
              )}
            </Text>
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton type={'confirm'} onPress={handleOnPress}>
            {strings('fiat_on_ramp_aggregator.onboarding.get_started')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default GetStarted;
