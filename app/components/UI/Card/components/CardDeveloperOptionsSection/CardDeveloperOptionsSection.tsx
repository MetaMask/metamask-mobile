import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../hooks/useStyles';

const cardDeveloperOptionsSectionStyles = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      gap: 8,
    },
    heading: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
  });

const CardDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const { styles } = useStyles(cardDeveloperOptionsSectionStyles, {});

  const handleResetOnboardingState = () => {
    dispatch(resetOnboardingState());
  };

  return (
    <View style={styles.container}>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'Card'}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {
          'Reset Card onboarding state to start the onboarding flow from the beginning.'
        }
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={'Reset Onboarding State'}
        onPress={handleResetOnboardingState}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </View>
  );
};

export default CardDeveloperOptionsSection;
