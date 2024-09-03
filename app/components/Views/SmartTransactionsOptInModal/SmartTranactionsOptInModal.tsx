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
import StorageWrapper from '../../../store/storage-wrapper';
import { CURRENT_APP_VERSION } from '../../../constants/storage';
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
import Engine from '../../../core/Engine';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import AppConstants from '../../../core/AppConstants';
import backgroundImage from '../../../images/smart-transactions-opt-in-bg.png';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { useDispatch } from 'react-redux';
import { updateOptInModalAppVersionSeen } from '../../../core/redux/slices/smartTransactions';

const MODAL_MARGIN = 24;
const MODAL_PADDING = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const itemWidth = screenWidth - MODAL_MARGIN * 2;
const maxItemHeight = screenHeight - 200;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    scroll: {
      maxHeight: maxItemHeight,
    },
    content: {
      gap: 16,
      paddingHorizontal: MODAL_PADDING,
    },
    buttons: {
      gap: 10,
      justifyContent: 'center',
    },
    button: {
      width: '100%',
      textAlign: 'center',
    },
    secondaryButtonText: {
      color: colors.text.alternative,
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
      marginHorizontal: MODAL_MARGIN,
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
      height: 140,
      justifyContent: 'center',
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
            variant={TextVariant.BodySM}
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
  const modalRef = useRef<ReusableModalRef>(null);
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const dispatch = useDispatch();

  const styles = createStyles(colors);

  const hasOptedIn = useRef<boolean | null>(null);

  const dismissModal = async () => {
    modalRef.current?.dismissModal();
  };

  const markOptInModalAsSeen = async () => {
    const version = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    dispatch(updateOptInModalAppVersionSeen(version));
  };

  const optIn = async () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(true);
    trackEvent(MetaMetricsEvents.SMART_TRANSACTION_OPT_IN, {
      stx_opt_in: true,
      location: 'SmartTransactionsOptInModal',
    });
    hasOptedIn.current = true;
    await markOptInModalAsSeen();
    dismissModal();
  };

  const optOut = async () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(false);
    trackEvent(MetaMetricsEvents.SMART_TRANSACTION_OPT_IN, {
      stx_opt_in: false,
      location: 'SmartTransactionsOptInModal',
    });
    hasOptedIn.current = false;
    await markOptInModalAsSeen();
    dismissModal();
  };

  const handleDismiss = async () => {
    // Opt out of STX if no prior decision made.
    if (hasOptedIn.current === null) {
      optOut();
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <Text color={TextColor.Default} variant={TextVariant.HeadingSM}>
        {strings('whats_new.stx.header')}
      </Text>
    </View>
  );

  const Benefits = () => (
    <View style={styles.benefits}>
      <Benefit
        iconName={IconName.Confirmation}
        text={[
          strings('whats_new.stx.benefit_1_1'),
          strings('whats_new.stx.benefit_1_2'),
        ]}
      />
      <Benefit
        iconName={IconName.Coin}
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
  );

  const Descriptions = () => (
    <View style={styles.descriptions}>
      <Text>{strings('whats_new.stx.description_1')}</Text>
      <Text>
        {strings('whats_new.stx.description_2')}{' '}
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
  );

  const PrimaryButton = () => (
    <Button
      style={styles.button}
      variant={ButtonVariants.Primary}
      onPress={optIn}
      label={strings('whats_new.stx.primary_button')}
    >
      {strings('whats_new.stx.primary_button')}
    </Button>
  );

  const SecondaryButton = () => (
    <Button
      style={styles.button}
      variant={ButtonVariants.Link}
      onPress={optOut}
      label={
        <Text style={styles.secondaryButtonText}>
          {strings('whats_new.stx.no_thanks')}
        </Text>
      }
    >
      {strings('whats_new.stx.no_thanks')}
    </Button>
  );

  return (
    <ReusableModal
      ref={modalRef}
      style={styles.screen}
      onDismiss={handleDismiss}
      isInteractable={false}
    >
      <View
        style={styles.modal}
        testID={SmartTransactionsOptInModalSelectorsIDs.CONTAINER}
      >
        <View style={styles.bodyContainer}>
          <ImageBackground
            source={backgroundImage}
            resizeMode="cover"
            style={styles.backgroundImage}
          >
            <Header />
            <Benefits />
          </ImageBackground>

          {/* Content */}
          <ScrollView>
            <View style={styles.content}>
              <Descriptions />

              <View style={styles.buttons}>
                <PrimaryButton />
                <SecondaryButton />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ReusableModal>
  );
};

export default SmartTransactionsOptInModal;
