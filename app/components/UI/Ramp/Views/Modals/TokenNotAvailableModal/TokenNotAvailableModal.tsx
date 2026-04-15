import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import styleSheet from './TokenNotAvailableModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRampsProviders } from '../../../hooks/useRampsProviders';
import { useRampsTokens } from '../../../hooks/useRampsTokens';
import { createProviderSelectionModalNavigationDetails } from '../ProviderSelectionModal';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { TOKEN_NOT_AVAILABLE_MODAL_TEST_IDS } from './TokenNotAvailableModal.testIds';

import type { BuyFlowOrigin } from '../../BuildQuote/BuildQuote';

export interface TokenNotAvailableModalParams {
  assetId: string;
  /** Which flow the user used to enter the Buy screen. */
  buyFlowOrigin?: BuyFlowOrigin;
}

export const createTokenNotAvailableModalNavigationDetails =
  createNavigationDetails<TokenNotAvailableModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE,
  );

function TokenNotAvailableModal() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { assetId, buyFlowOrigin } = useParams<TokenNotAvailableModalParams>();
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const { selectedProvider } = useRampsProviders();
  const { selectedToken } = useRampsTokens();

  const tokenName = selectedToken?.name ?? '';
  const providerName = selectedProvider?.name ?? '';

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
        .addProperties({
          location: 'Token Unavailable Modal',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleChangeToken = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHANGE_TOKEN_BUTTON_CLICKED)
        .addProperties({
          current_provider: selectedProvider?.name,
          location: 'Token Unavailable Modal',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    sheetRef.current?.onCloseBottomSheet(() => {
      if (buyFlowOrigin === 'tokenInfo') {
        // Token Info buy flow: return to the Tokens Full View screen
        navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW as never);
      } else if (buyFlowOrigin === 'homeTokenList') {
        // Home token list buy flow: return to home screen
        navigation.navigate(Routes.WALLET.HOME as never);
      } else {
        navigation.navigate(Routes.RAMP.TOKEN_SELECTION, {
          screen: Routes.RAMP.TOKEN_SELECTION,
        });
      }
    });
  }, [
    navigation,
    buyFlowOrigin,
    selectedProvider?.name,
    trackEvent,
    createEventBuilder,
  ]);

  const handleChangeProvider = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHANGE_PROVIDER_BUTTON_CLICKED)
        .addProperties({
          current_provider: selectedProvider?.name,
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(
        ...createProviderSelectionModalNavigationDetails({
          assetId,
          skipQuotes: true,
        }),
      );
    });
  }, [
    navigation,
    assetId,
    selectedProvider?.name,
    trackEvent,
    createEventBuilder,
  ]);

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CLOSE_BUTTON_CLICKED)
        .addProperties({
          location: 'Token Unavailable Modal',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    sheetRef.current?.onCloseBottomSheet();
  }, [trackEvent, createEventBuilder]);

  const handleDismiss = useCallback(
    (hasPendingAction?: boolean) => {
      if (!hasPendingAction) {
        if (buyFlowOrigin === 'tokenInfo') {
          // Token Info buy flow: pop back through the ramp flow to the
          // existing Asset screen. BottomSheet already performs one goBack
          // when shouldNavigateBack is true; we need one more to exit ramp.
          navigation.goBack();
        } else if (buyFlowOrigin === 'homeTokenList') {
          // Home token list buy flow: return to home screen
          navigation.navigate(Routes.WALLET.HOME as never);
        } else {
          navigation.navigate(Routes.RAMP.TOKEN_SELECTION, {
            screen: Routes.RAMP.TOKEN_SELECTION,
          });
        }
      }
    },
    [navigation, buyFlowOrigin],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      onClose={handleDismiss}
      testID={TOKEN_NOT_AVAILABLE_MODAL_TEST_IDS.MODAL}
    >
      <HeaderCompactStandard
        title={strings('fiat_on_ramp.token_unavailable_modal.title')}
        onClose={handleClose}
        closeButtonProps={{
          testID: TOKEN_NOT_AVAILABLE_MODAL_TEST_IDS.CLOSE_BUTTON,
        }}
      />

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('fiat_on_ramp.token_unavailable_modal.description', {
            token: tokenName,
            provider: providerName,
          })}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            size={ButtonBaseSize.Lg}
            onPress={handleChangeToken}
            variant={ButtonVariant.Secondary}
            isFullWidth
            testID={TOKEN_NOT_AVAILABLE_MODAL_TEST_IDS.CHANGE_TOKEN_BUTTON}
          >
            {strings('fiat_on_ramp.token_unavailable_modal.change_token')}
          </Button>
        </View>
        <View style={styles.footerButton}>
          <Button
            size={ButtonBaseSize.Lg}
            onPress={handleChangeProvider}
            variant={ButtonVariant.Primary}
            isFullWidth
            testID={TOKEN_NOT_AVAILABLE_MODAL_TEST_IDS.CHANGE_PROVIDER_BUTTON}
          >
            {strings('fiat_on_ramp.token_unavailable_modal.change_provider')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default TokenNotAvailableModal;
