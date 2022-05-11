import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Image, View, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import TextJS from '../../../Base/Text';
import ListItemJS from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import ScreenLayout from '../components/ScreenLayout';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useFiatOnRampSDK } from '../sdk';
import ErrorViewWithReportingJS from '../components/ErrorViewWithReporting';

const IMG_PADDING = 80;
const DEVICE_WIDTH = Dimensions.get('window').width;

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const getStartedIcon = require('../components/images/get-started.png');

// TODO: Convert into typescript and correctly type optionals
const Text = TextJS as any;
const ListItem = ListItemJS as any;
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
    width: DEVICE_WIDTH - IMG_PADDING,
    height: 250,
    marginTop: 30,
  },
  ctaWrapper: {
    marginBottom: 30,
    marginTop: 20,
  },
});

const whatToExpectList = [
  {
    id: 1,
    title: strings('fiat_on_ramp_aggregator.onboarding.save_time_money'),
    description: strings(
      'fiat_on_ramp_aggregator.onboarding.save_time_money_description',
    ),
    icon: 'clock-outline',
  },
  {
    id: 2,
    title: strings(
      'fiat_on_ramp_aggregator.onboarding.full_control_at_your_hands',
    ),
    description: strings(
      'fiat_on_ramp_aggregator.onboarding.full_control_at_your_hands_description',
    ),
    icon: 'tune',
  },
  {
    id: 3,
    title: strings(
      'fiat_on_ramp_aggregator.onboarding.growing_collection_of_tokens',
    ),
    description: strings(
      'fiat_on_ramp_aggregator.onboarding.growing_collection_of_tokens_description',
    ),
    icon: 'format-list-bulleted',
  },
];

const GetStarted: React.FC = () => {
  const navigation = useNavigation();
  const { getStarted, setGetStarted, sdkError } = useFiatOnRampSDK();

  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.onboarding.what_to_expect'),
          showBack: false,
        },
        colors,
      ),
    );
  }, [navigation, colors]);

  const handleOnPress = useCallback(() => {
    navigation.navigate('Region');
    setGetStarted(true);
  }, [navigation, setGetStarted]);

  useEffect(() => {
    if (getStarted) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Region_hasStarted' }],
      });
    }
  }, [getStarted, navigation]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
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
          {whatToExpectList.map(({ id, title, description, icon }) => (
            <ListItem.Content key={id} style={styles.listItem}>
              <ListItem.Icon style={styles.icon}>
                <MaterialCommunityIcons name={icon} style={styles.icon} />
              </ListItem.Icon>
              <ListItem.Body>
                <ListItem.Title bold style={styles.title}>
                  {title}
                </ListItem.Title>
                <Text style={styles.description}>{description}</Text>
              </ListItem.Body>
            </ListItem.Content>
          ))}
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
