import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { strings } from '../../../../../../locales/i18n';
import {
  getNeobankStageRoute,
  type NeobankStageRoute,
} from './neobankStageRoute';

const NeobankOnboardingRouter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const account = useSelector(selectPrimaryMoneyAccount);
  const tw = useTailwind();
  const [surface, setSurface] = useState<NeobankStageRoute>('processing');
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const hydrationAttempt = retryCount;
      let isActive = true;

      const hydrate = async () => {
        setIsLoading(true);
        try {
          if (!account?.address) {
            throw new Error('No selected account');
          }
          await Engine.context.KycController.initialize({
            product: 'money',
            vendor: 'iron',
          });
          const stage =
            await Engine.context.RampsController.hydrateNeobankStore({
              walletAddress: account.address,
            });
          if (!isActive || hydrationAttempt !== retryCount) {
            return;
          }

          const nextSurface = getNeobankStageRoute(stage);
          setSurface(nextSurface);
          if (nextSurface === 'terms') {
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.RAMP.GET_PIX_KEY }],
            });
          } else if (nextSurface === 'identity') {
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.RAMP.VBA_VERIFY_IDENTITY }],
            });
          } else if (nextSurface === 'complete') {
            navigation.navigate(Routes.MONEY.ROOT, {
              screen: Routes.MONEY.HOME,
            });
          }
        } catch {
          if (isActive) {
            setSurface('error');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      hydrate();
      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active' && isActive) {
            setRetryCount((count) => count + 1);
          }
        },
      );
      return () => {
        isActive = false;
        appStateSubscription.remove();
      };
    }, [account?.address, navigation, retryCount]),
  );

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const title =
    surface === 'email'
      ? strings('virtual_bank_account.onboarding.verify_email_title')
      : surface === 'error'
        ? strings('virtual_bank_account.onboarding.error_title')
        : strings('virtual_bank_account.onboarding.processing_title');
  const description =
    surface === 'email'
      ? strings('virtual_bank_account.onboarding.verify_email_description')
      : surface === 'error'
        ? strings('virtual_bank_account.onboarding.error_description')
        : strings('virtual_bank_account.onboarding.processing_description');

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard onBack={goBack} includesTopInset />
      <Box twClassName="flex-1 justify-center px-6 gap-3">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {isLoading
            ? strings('virtual_bank_account.onboarding.loading_title')
            : title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {isLoading
            ? strings('virtual_bank_account.onboarding.loading_description')
            : description}
        </Text>
        {!isLoading && surface === 'error' ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={retry}
          >
            {strings('virtual_bank_account.onboarding.retry')}
          </Button>
        ) : null}
      </Box>
    </SafeAreaView>
  );
};

export default NeobankOnboardingRouter;
