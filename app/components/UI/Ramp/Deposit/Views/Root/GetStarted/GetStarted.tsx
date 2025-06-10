import React, { useCallback, useEffect } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../../StyledButton';
import { strings } from '../../../../../../../../locales/i18n';
import { useDepositSDK } from '../../../sdk';
import styleSheet from './GetStarted.styles';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../../Navbar';
import { useStyles } from '../../../../../../../component-library/hooks';
import getStartedIcon from '../../../assets/deposit-get-started-illustration.png';
import IonicIcon from 'react-native-vector-icons/Ionicons';

const bulletPoints = [
  {
    title: strings('deposit.get_started.bullet_1_title'),
    description: strings('deposit.get_started.bullet_1_description'),
  },
  {
    title: strings('deposit.get_started.bullet_2_title'),
    description: strings('deposit.get_started.bullet_2_description'),
  },
  {
    title: strings('deposit.get_started.bullet_3_title'),
    description: strings('deposit.get_started.bullet_3_description'),
  },
];

const GetStarted: React.FC = () => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  const { getStarted, setGetStarted } = useDepositSDK();

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Deposit' }, theme),
    );
  }, [navigation, theme]);

  const handleOnPress = useCallback(() => {
    setGetStarted(true);
  }, [setGetStarted]);

  if (getStarted) {
    // Avoid flashing the original content when the user has already seen it
    return <ScreenLayout />;
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScrollView>
          <ScreenLayout.Content>
            <View style={styles.getStartedImageWrapper}>
              <Image source={getStartedIcon} style={styles.getStartedImage} />
            </View>
          </ScreenLayout.Content>
          <ScreenLayout.Content>
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {strings('deposit.get_started.title')}
            </Text>
          </ScreenLayout.Content>
          <ScreenLayout.Content>
            {bulletPoints.map((bulletPoint, index) => (
              <View key={index} style={styles.bulletPointContainer}>
                <IonicIcon
                  size={24}
                  name="checkmark"
                  style={styles.checkIcon}
                />
                <View style={styles.bulletPointContent}>
                  <Text
                    variant={TextVariant.BodyMD}
                    style={styles.bulletPointTitle}
                  >
                    {bulletPoint.title}
                  </Text>
                  <Text variant={TextVariant.BodySM}>
                    {bulletPoint.description}
                  </Text>
                </View>
              </View>
            ))}
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
