import React, { useRef } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import LearnMoreImage from '../components/images/LearnMoreEthBanner.png';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { POOLED_STAKING_FAQ_URL } from '../constants';

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    imageContainer: {
      alignItems: 'center',
      paddingBottom: 16,
    },
    bannerImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
    },
    textContainer: {
      paddingVertical: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    button: {
      flex: 1,
    },
    italicText: {
      fontStyle: 'italic',
    },
  });

const ModalTextBlock = ({
  heading,
  body,
  bodyColor = TextColor.Alternative,
}: {
  heading: string;
  body: string;
  bodyColor?: TextColor;
}) => {
  const styles = createStyles();
  return (
    <View style={styles.textContainer}>
      <Text variant={TextVariant.BodyMDMedium}>{heading}</Text>
      <Text variant={TextVariant.BodyMD} color={bodyColor}>
        {body}
      </Text>
    </View>
  );
};

const LearnMoreModal = () => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const navigation = useNavigation();

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={LearnMoreImage} style={styles.bannerImage} />
        </View>

        <View style={styles.textContainer}>
          <Text variant={TextVariant.HeadingLG}>
            {strings('stake.stake_eth_and_earn')}
          </Text>
        </View>

        <ModalTextBlock
          heading={strings('stake.stake_any_amount_of_eth')}
          body={strings('stake.no_minimum_required')}
        />
        <ModalTextBlock
          heading={strings('stake.earn_eth_rewards')}
          body={strings('stake.earn_eth_rewards_description')}
        />
        <ModalTextBlock
          heading={strings('stake.flexible_unstaking')}
          body={strings('stake.flexible_unstaking_description')}
        />
        <View style={styles.textContainer}>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.italicText}
          >
            {strings('stake.disclaimer')}
          </Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <View style={styles.button}>
          <Button
            onPress={() => {
              navigation.navigate('Webview', {
                screen: 'SimpleWebview',
                params: {
                  url: POOLED_STAKING_FAQ_URL,
                },
              });
            }} // Take to the faq page
            label={strings('stake.learn_more')}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
        <View style={styles.button}>
          <Button
            onPress={handleClose}
            label={strings('stake.got_it')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default LearnMoreModal;
