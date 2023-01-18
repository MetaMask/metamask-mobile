import React, { useCallback, useEffect } from 'react';
import { Image, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../components/ScreenLayout';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useFiatOnRampSDK } from '../../sdk';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import Routes from '../../../../../constants/navigation/Routes';
import useAnalytics from '../../hooks/useAnalytics';
import styles from './GetStarted.styles';
import { createRegionsNavDetails } from '../Regions/Regions';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const getStartedIcon = require('../../components/images/WalletInfo.png');

const GetStarted: React.FC = () => {
  const navigation = useNavigation();
  const {
    getStarted,
    setGetStarted,
    sdkError,
    selectedChainId,
    selectedRegion,
  } = useFiatOnRampSDK();
  const trackEvent = useAnalytics();

  const { colors } = useTheme();

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Get Started Screen',
      chain_id_destination: selectedChainId,
    });
  }, [selectedChainId, trackEvent]);

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
    navigation.navigate(...createRegionsNavDetails());
    setGetStarted(true);
  }, [navigation, setGetStarted]);

  useEffect(() => {
    if (getStarted) {
      if (selectedRegion) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD_HAS_STARTED,
              params: { showBack: false },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.FIAT_ON_RAMP_AGGREGATOR.REGION_HAS_STARTED }],
        });
      }
    }
  }, [getStarted, navigation, selectedRegion]);

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
              {strings('fiat_on_ramp_aggregator.onboarding.best_quotes')}
            </Text>
          </ScreenLayout.Content>
          <ScreenLayout.Content>
            <Text centered bold>
              {strings('fiat_on_ramp_aggregator.onboarding.benefits')}
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
