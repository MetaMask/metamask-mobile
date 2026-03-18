import React, { useCallback } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import ActionModal from '../ActionModal';
import { protectWalletModalNotVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import scaling from '../../../util/scaling';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { ProtectWalletModalSelectorsIDs } from './ProtectWalletModal.testIds';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs
const protectWalletImage = require('../../../images/explain-backup-seedphrase.png');

interface RootState {
  user: {
    protectWalletModalVisible: boolean;
    passwordSet: boolean;
  };
}

interface ProtectYourWalletModalProps {
  navigation?: {
    navigate: (route: string, params?: Record<string, unknown>) => void;
  };
}

const ProtectYourWalletModal = ({
  navigation,
}: ProtectYourWalletModalProps) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const protectWalletModalVisible = useSelector(
    (state: RootState) => state.user.protectWalletModalVisible,
  );
  const passwordSet = useSelector(
    (state: RootState) => state.user.passwordSet,
  );
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  const goToBackupFlow = useCallback(() => {
    dispatch(protectWalletModalNotVisible());
    navigation?.navigate(
      'SetPasswordFlow',
      passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED)
        .addProperties({
          wallet_protection_required: false,
          source: 'Modal',
        })
        .build(),
    );
  }, [dispatch, navigation, passwordSet, trackEvent, createEventBuilder]);

  const onLearnMore = useCallback(() => {
    dispatch(protectWalletModalNotVisible());
    navigation?.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
        title: strings('protect_wallet_modal.title'),
      },
    });
  }, [dispatch, navigation]);

  const onDismiss = useCallback(() => {
    dispatch(protectWalletModalNotVisible());
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED)
        .addProperties({
          wallet_protection_required: false,
          source: 'Modal',
        })
        .build(),
    );
  }, [dispatch, trackEvent, createEventBuilder]);

  if (isSeedlessOnboardingLoginFlow) {
    return null;
  }

  return (
    <ActionModal
      modalVisible={protectWalletModalVisible}
      cancelText={strings('protect_wallet_modal.top_button')}
      confirmText={strings('protect_wallet_modal.bottom_button')}
      onCancelPress={goToBackupFlow}
      onRequestClose={onDismiss}
      onConfirmPress={onDismiss}
      cancelButtonMode={'sign'}
      confirmButtonMode={'transparent-blue'}
      verticalButtons
      cancelTestID={ProtectWalletModalSelectorsIDs.CANCEL_BUTTON}
      confirmTestID={ProtectWalletModalSelectorsIDs.CONFIRM_BUTTON}
    >
      <Box
        twClassName="mt-6 mx-6 flex-1"
        testID={ProtectWalletModalSelectorsIDs.CONTAINER}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
        >
          <Box twClassName="w-[26px]" />
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="text-center flex-1"
          >
            {strings('protect_wallet_modal.title')}
          </Text>
          <TouchableOpacity
            onPress={onDismiss}
            style={tw.style('p-1')}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Sm}
              color={IconColor.Default}
            />
          </TouchableOpacity>
        </Box>

        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="mb-3 mt-[30px]"
        >
          <Image
            source={protectWalletImage}
            style={{
              width: scaling.scale(135, { baseModel: 1 }),
              height: scaling.scale(160, { baseModel: 1 }),
            }}
          />
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          twClassName="text-center mb-6"
        >
          {strings('protect_wallet_modal.text')}
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
            {' ' + strings('protect_wallet_modal.text_bold')}
          </Text>
        </Text>

        <Button
          variant={ButtonVariants.Link}
          onPress={onLearnMore}
          testID={ProtectWalletModalSelectorsIDs.LEARN_MORE_BUTTON}
          label={
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryDefault}
              twClassName="text-center mb-3.5"
            >
              {strings('protect_wallet_modal.action')}
            </Text>
          }
        />
      </Box>
    </ActionModal>
  );
};

export default ProtectYourWalletModal;
