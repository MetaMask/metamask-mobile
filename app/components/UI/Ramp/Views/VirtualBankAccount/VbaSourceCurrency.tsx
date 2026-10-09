import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import BankDetailRow from '../../components/BankDetailRow/BankDetailRow';
import { VbaOnboardingRoutes } from './routes';

export type VbaSourceCurrencyCode = 'USD' | 'BRL';

export const VbaSourceCurrencySelectorsIDs = {
  CONTAINER: 'vba-source-currency-container',
  USD_BUTTON: 'vba-source-currency-usd-button',
  BRL_BUTTON: 'vba-source-currency-brl-button',
  CONTINUE_BUTTON: 'vba-source-currency-continue-button',
  CREATED: 'vba-source-currency-created',
  PIX_BUTTON: 'vba-source-currency-pix-button',
  DONE_BUTTON: 'vba-source-currency-done-button',
} as const;

interface CreatedAutoramp {
  id: string;
  status: string;
  sourceCurrencyCode: VbaSourceCurrencyCode;
}

const VbaSourceCurrency = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const [selected, setSelected] = useState<VbaSourceCurrencyCode | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [created, setCreated] = useState<CreatedAutoramp | null>(null);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(async () => {
    if (!selected || !walletAddress || isContinuing) {
      return;
    }
    setIsContinuing(true);
    setCreateError(false);
    try {
      const registration =
        await Engine.context.RampsController.registerMoneyAccountWallet({
          address: walletAddress,
        });
      if (registration.type === 'lookupUnavailable') {
        setCreateError(true);
        return;
      }
      const autoramp = await Engine.context.RampsController.createAutoramp(
        buildMusdAutorampRequest(walletAddress, selected),
      );
      setCreated({
        id: autoramp.id,
        status: autoramp.status,
        sourceCurrencyCode: selected,
      });
    } catch (error) {
      setCreateError(true);
      Logger.error(error as Error, {
        message: 'VbaSourceCurrency: failed to create autoramp',
      });
    } finally {
      setIsContinuing(false);
    }
  }, [isContinuing, selected, walletAddress]);

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleViewPix = useCallback(() => {
    navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.DETAILS,
    });
  }, [navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard onBack={handleBack} includesTopInset />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaSourceCurrencySelectorsIDs.CONTAINER}
      >
        {created ? (
          <Box testID={VbaSourceCurrencySelectorsIDs.CREATED}>
            <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
              {strings('virtual_bank_account.source_currency.created_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-2 mb-4"
            >
              {strings(
                'virtual_bank_account.source_currency.created_description',
              )}
            </Text>
            <BankDetailRow
              label={strings(
                'virtual_bank_account.source_currency.currency_label',
              )}
              value={created.sourceCurrencyCode}
            />
            <BankDetailRow
              label={strings(
                'virtual_bank_account.source_currency.route_id_label',
              )}
              value={created.id}
            />
            <BankDetailRow
              label={strings(
                'virtual_bank_account.source_currency.status_label',
              )}
              value={created.status}
            />
          </Box>
        ) : (
          <>
            <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
              {strings('virtual_bank_account.source_currency.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-2 mb-4"
            >
              {strings('virtual_bank_account.source_currency.description')}
            </Text>
            <Box twClassName="gap-3">
              <Button
                variant={
                  selected === 'USD'
                    ? ButtonVariant.Primary
                    : ButtonVariant.Secondary
                }
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => setSelected('USD')}
                testID={VbaSourceCurrencySelectorsIDs.USD_BUTTON}
              >
                {strings('virtual_bank_account.source_currency.usd')}
              </Button>
              <Button
                variant={
                  selected === 'BRL'
                    ? ButtonVariant.Primary
                    : ButtonVariant.Secondary
                }
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => setSelected('BRL')}
                testID={VbaSourceCurrencySelectorsIDs.BRL_BUTTON}
              >
                {strings('virtual_bank_account.source_currency.brl')}
              </Button>
            </Box>
            {createError ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.ErrorDefault}
                twClassName="mt-4"
              >
                {strings('virtual_bank_account.source_currency.error')}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
      <Box twClassName="gap-3 p-4">
        {created?.sourceCurrencyCode === 'BRL' ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleViewPix}
            testID={VbaSourceCurrencySelectorsIDs.PIX_BUTTON}
          >
            {strings('virtual_bank_account.source_currency.view_pix')}
          </Button>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isContinuing}
          isDisabled={created ? false : !selected || isContinuing}
          onPress={created ? handleDone : handleContinue}
          testID={
            created
              ? VbaSourceCurrencySelectorsIDs.DONE_BUTTON
              : VbaSourceCurrencySelectorsIDs.CONTINUE_BUTTON
          }
        >
          {created
            ? strings('virtual_bank_account.source_currency.done')
            : strings('virtual_bank_account.source_currency.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaSourceCurrency;
