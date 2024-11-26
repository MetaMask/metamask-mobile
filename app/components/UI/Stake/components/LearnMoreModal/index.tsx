import React, { useRef } from 'react';
import { View, Image } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import LearnMoreImage from '../images/LearnMoreEthBanner.png';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import createLearnMoreModalStyles from './LearnMoreModal.styles';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { withMetaMetrics } from '../../utils/metaMetrics/withMetaMetrics';

const styles = createLearnMoreModalStyles();

const ModalTextBlock = ({
  heading,
  body,
  bodyColor = TextColor.Alternative,
}: {
  heading: string;
  body: string;
  bodyColor?: TextColor;
}) => (
  <View style={styles.textContainer}>
    <Text variant={TextVariant.BodyMDMedium}>{heading}</Text>
    <Text variant={TextVariant.BodyMD} color={bodyColor}>
      {body}
    </Text>
  </View>
);

const LearnMoreModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const navigation = useNavigation();

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleLearnMoreBrowserRedirect = () => {
    // Take to the faq page
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: POOLED_STAKING_FAQ_URL,
      },
    });
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
            onPress={withMetaMetrics(handleLearnMoreBrowserRedirect, {
              event: MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED,
              properties: {
                selected_provider: 'consensys',
                text: 'Learn More',
                location: 'Learn More Modal',
              },
            })}
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
