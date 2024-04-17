import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Linking,
  ImageBackground,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import AsyncStorage from '../../../store/async-storage-wrapper';
import {
  CURRENT_APP_VERSION,
  SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
} from '../../../constants/storage';
import { useTheme } from '../../../util/theme';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { Colors } from '../../../util/theme/models';
import { SmartTransactionsOptInModalSelectorsIDs } from '../../../../e2e/selectors/Modals/SmartTransactionsOptInModal.selectors';
import { useNavigation } from '@react-navigation/native';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import AppConstants from '../../../core/AppConstants';
import backgroundImage from '../../../images/smart-transactions-opt-in-bg.png';

const modalMargin = 24;
const modalPadding = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const itemWidth = screenWidth - modalMargin * 2;
const maxItemHeight = screenHeight - 200;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    scroll: {
      maxHeight: maxItemHeight,
    },
    content: {
      gap: 16,
      padding: modalPadding,
    },
    buttons: {
      gap: 10,
      justifyContent: 'center',
    },
    button: {
      width: '100%',
      textAlign: 'center',
    },
    header: {
      alignItems: 'center',
    },
    descriptions: {
      gap: 16,
    },
    screen: { justifyContent: 'center', alignItems: 'center' },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: modalMargin,
    },
    bodyContainer: {
      width: itemWidth,
      paddingVertical: 16,
      paddingBottom: 16,
    },
    benefits: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    benefit: {
      width: '33%',
      gap: 4,
      alignItems: 'center',
    },
    benefitIcon: {
      width: 35,
      height: 35,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 50,
      backgroundColor: colors.primary.muted,
    },
    benefitText: {
      textAlign: 'center',
    },
    backgroundImage: {
      gap: 16,
    },
  });

interface Props {
  iconName: IconName;
  text: string[];
}
const Benefit = ({ iconName, text }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.benefit}>
      <Icon name={iconName} color={colors.primary.default} size={IconSize.Xl} />

      <View>
        {text.map((t) => (
          <Text
            key={t}
            color={TextColor.Alternative}
            variant={TextVariant.BodyXS}
            style={styles.benefitText}
          >
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
};

const SmartTransactionsOptInModal = () => {
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const hasOptedIn = useRef<boolean | null>(null);

  const dismissModal = async () => {
    modalRef.current?.dismissModal();
  };

  const optIn = () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(true);
    hasOptedIn.current = true;
    dismissModal();
  };

  const optOut = () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(false);
    hasOptedIn.current = false;
    dismissModal();
  };

  const onDismiss = async () => {
    // Opt out of STX if no prior decision made
    if (hasOptedIn.current === null) {
      optOut();
    }

    // Save the current app version as the last app version seen
    const version = await AsyncStorage.getItem(CURRENT_APP_VERSION);
    await AsyncStorage.setItem(
      SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
      version as string,
    );

    // See if we need to show What's New modal
    const shouldShowWhatsNew = await shouldShowWhatsNewModal();
    if (shouldShowWhatsNew) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WHATS_NEW,
      });
    }
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen} onDismiss={onDismiss}>
      <View
        style={styles.modal}
        testID={SmartTransactionsOptInModalSelectorsIDs.CONTAINER}
      >
        <View style={styles.bodyContainer}>
          <ImageBackground
            source={backgroundImage}
            resizeMode="repeat"
            style={styles.backgroundImage}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text color={TextColor.Default} variant={TextVariant.HeadingSM}>
                {strings('whats_new.stx.header')}
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefits}>
              <Benefit
                iconName={IconName.Confirmation}
                text={[
                  strings('whats_new.stx.benefit_1_1'),
                  strings('whats_new.stx.benefit_1_2'),
                ]}
              />
              <Benefit
                iconName={IconName.SecurityDouble}
                text={[
                  strings('whats_new.stx.benefit_2_1'),
                  strings('whats_new.stx.benefit_2_2'),
                ]}
              />
              <Benefit
                iconName={IconName.Clock}
                text={[
                  strings('whats_new.stx.benefit_3_1'),
                  strings('whats_new.stx.benefit_3_2'),
                ]}
              />
            </View>
          </ImageBackground>

          {/* Content */}
          <ScrollView>
            <View style={styles.content}>
              <View style={styles.descriptions}>
                <Text>{strings('whats_new.stx.description_1')}</Text>
                <Text>{strings('whats_new.stx.description_2')}</Text>
                <Text>
                  {strings('whats_new.stx.description_3')}{' '}
                  <Text
                    color={TextColor.Primary}
                    onPress={() => {
                      Linking.openURL(AppConstants.URLS.SMART_TXS);
                    }}
                  >
                    {strings('whats_new.stx.learn_more')}
                  </Text>
                </Text>
              </View>

              <View style={styles.buttons}>
                <Button
                  style={styles.button}
                  variant={ButtonVariants.Primary}
                  onPress={optIn}
                  label={strings('whats_new.stx.primary_button')}
                >
                  {strings('whats_new.stx.primary_button')}
                </Button>

                <Button
                  style={styles.button}
                  variant={ButtonVariants.Link}
                  onPress={optOut}
                  label={strings('whats_new.stx.secondary_button')}
                >
                  {strings('whats_new.stx.secondary_button')}
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ReusableModal>
  );
};

export default SmartTransactionsOptInModal;
