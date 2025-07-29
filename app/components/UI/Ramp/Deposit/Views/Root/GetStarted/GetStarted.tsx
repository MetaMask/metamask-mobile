import React, { useCallback, useEffect } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../locales/i18n';
import { useDepositSDK } from '../../../sdk';
import styleSheet from './GetStarted.styles';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../../Navbar';
import { useStyles } from '../../../../../../../component-library/hooks';
import getStartedIcon from '../../../assets/deposit-get-started-illustration.png';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';

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
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.get_started.navbar_title') },
        theme,
      ),
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
              <Image
                source={getStartedIcon}
                style={styles.getStartedImage}
                resizeMode="contain"
              />
            </View>
          </ScreenLayout.Content>

          <ScreenLayout.Content>
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {strings('deposit.get_started.title')}
            </Text>
            {bulletPoints.map((bulletPoint, index) => (
              <View key={index} style={styles.bulletPointContainer}>
                <Icon
                  name={IconName.Check}
                  color={theme.colors.success.default}
                  size={IconSize.Lg}
                />
                <View style={styles.bulletPointContent}>
                  <Text variant={TextVariant.BodyMDBold}>
                    {bulletPoint.title}
                  </Text>
                  <Text variant={TextVariant.BodyMD}>
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
          <Button
            size={ButtonSize.Lg}
            onPress={handleOnPress}
            label={strings('fiat_on_ramp_aggregator.onboarding.get_started')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default GetStarted;
