import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import MockKycProgressBar from './MockKycProgressBar';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';
import {
  DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  DEMO_AUTORAMP_DESTINATION_TOKEN,
  DEMO_AUTORAMP_SOURCE_CURRENCY_CODE,
} from './constants';

/**
 * Demo-only KYC success screen. Finishing creates the autoramp (the standing
 * Pix -> crypto conversion rule) and hands off to the Virtual Bank Account
 * screen, which then tracks its status over the neo-bank websocket.
 *
 * The MoonPay `customer_id` is not passed here on purpose: `createAutoramp`
 * resolves it from the KYC controller's verified identity.
 */
const MockKycSuccess = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedInternalAccountAddress);

  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleFinish = useCallback(async () => {
    setErrorMessage(null);

    if (!walletAddress) {
      setErrorMessage(strings('virtual_bank_account.missing_wallet'));
      return;
    }

    setIsCreating(true);
    try {
      await Engine.context.RampsController.createAutoramp({
        source_currencies: [
          { type: 'fiat', code: DEMO_AUTORAMP_SOURCE_CURRENCY_CODE },
        ],
        destination_currency: {
          type: 'crypto',
          token: DEMO_AUTORAMP_DESTINATION_TOKEN,
          blockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
        },
        recipient_account: {
          type: 'crypto',
          chain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
          address: walletAddress,
        },
      });
      navigation.navigate(Routes.RAMP.VBA_ACCOUNT);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.create_failed'),
      );
    } finally {
      setIsCreating(false);
    }
  }, [navigation, walletAddress]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title={strings('virtual_bank_account.mock_kyc.success.navbar_title')}
        onBack={handleBack}
        backButtonProps={{ testID: MockKycSuccessSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <MockKycProgressBar filledCount={2} />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-4"
        testID={MockKycSuccessSelectorsIDs.CONTAINER}
      >
        <Box
          accessible={false}
          twClassName="relative mb-6 h-32 w-32 items-center justify-center"
        >
          <Box
            accessible={false}
            twClassName="h-24 w-20 gap-2 rounded-xl bg-muted p-3"
          >
            <Box
              accessible={false}
              twClassName="h-1 w-full rounded-full bg-icon-muted"
            />
            <Box
              accessible={false}
              twClassName="h-1 w-3/4 rounded-full bg-icon-muted"
            />
            <Box
              accessible={false}
              twClassName="h-1 w-full rounded-full bg-icon-muted"
            />
          </Box>
          <Box
            accessible={false}
            twClassName="absolute -bottom-1 -right-1 size-14 items-center justify-center rounded-full bg-primary-muted"
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Lg}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </Box>
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('virtual_bank_account.mock_kyc.success.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('virtual_bank_account.mock_kyc.success.description')}
        </Text>
      </Box>
      <Box twClassName="gap-3 p-4">
        {errorMessage ? (
          <Box twClassName="rounded-lg bg-error-muted p-3">
            <Text variant={TextVariant.BodyMd}>{errorMessage}</Text>
          </Box>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleFinish}
          isDisabled={isCreating}
          isLoading={isCreating}
          testID={MockKycSuccessSelectorsIDs.FINISH_BUTTON}
        >
          {strings('virtual_bank_account.mock_kyc.success.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default MockKycSuccess;
