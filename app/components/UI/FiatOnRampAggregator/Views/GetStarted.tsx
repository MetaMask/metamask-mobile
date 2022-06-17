import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Image, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TextJS from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import ScreenLayout from '../components/ScreenLayout';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useFiatOnRampSDK } from '../sdk';
import ErrorViewWithReportingJS from '../components/ErrorViewWithReporting';
import Routes from '../../../../constants/navigation/Routes';
import useAnalytics from '../hooks/useAnalytics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const getStartedIcon = require('../components/images/WalletInfo.png');

// TODO: Convert into typescript and correctly type optionals
const Text = TextJS as any;

const ErrorViewWithReporting = ErrorViewWithReportingJS as any;

const styles = StyleSheet.create({
  listItem: {
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
  },
  description: {
    marginVertical: 5,
  },
  icon: {
    alignSelf: 'flex-start',
    fontSize: 28,
    marginTop: 1,
    textAlign: 'center',
  },
  getStartedImageWrapper: { flexDirection: 'row', justifyContent: 'center' },
  getStartedImage: {
    marginTop: 80,
  },
  ctaWrapper: {
    marginBottom: 30,
    marginTop: 20,
  },
  marginTop: {
    marginTop: 15,
  },
  caption: {
    marginVertical: 22,
  },
});

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
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.REGION);
    setGetStarted(true);
  }, [navigation, setGetStarted]);

  useEffect(() => {
    if (getStarted) {
      if (selectedRegion) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.FIAT_ON_RAMP_AGGREGATOR.AMOUNT_TO_BUY_HAS_STARTED,
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
          <ErrorViewWithReporting error={sdkError} />
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
        <ScreenLayout.Content>
          <View style={styles.getStartedImageWrapper}>
            <Image
              style={styles.getStartedImage}
              resizeMethod={'auto'}
              source={getStartedIcon}
            />
          </View>
        </ScreenLayout.Content>
        <ScreenLayout.Content>
          <Text centered bold style={styles.marginTop}>
            {strings('fiat_on_ramp_aggregator.onboarding.best_quotes')}
          </Text>
          <Text centered bold style={styles.caption}>
            {strings('fiat_on_ramp_aggregator.onboarding.benefits')}
          </Text>
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.ctaWrapper}>
            <StyledButton type={'confirm'} onPress={handleOnPress}>
              {strings('fiat_on_ramp_aggregator.onboarding.get_started')}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default GetStarted;
