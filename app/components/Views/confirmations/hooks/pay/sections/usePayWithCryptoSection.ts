import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { useParams } from '../../../../../../util/navigation/navUtils';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TokenIcon, TokenIconVariant } from '../../../components/token-icon';
import { PayWithSectionConfig } from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { SetPayTokenRequest } from '../useAutomaticTransactionPayToken';

interface PayWithCryptoSectionParams {
  preferredPaymentToken?: SetPayTokenRequest;
}

export const PAY_WITH_CRYPTO_SECTION_TEST_ID = 'pay-with-section-crypto';
export const PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID =
  'pay-with-crypto-section-preferred-token-row';
export const PAY_WITH_CRYPTO_OTHER_ASSETS_ROW_TEST_ID =
  'pay-with-crypto-section-other-assets-row';

export function usePayWithCryptoSection(): PayWithSectionConfig | null {
  const navigation = useNavigation();
  const { preferredPaymentToken } = useParams<PayWithCryptoSectionParams>({});
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { hasTokens, preferredToken, selectedToken } = usePayWithPreferredToken(
    {
      preferredToken: preferredPaymentToken,
    },
  );

  const handleOtherAssetsPress = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  const preferredTokenBalance = useMemo(
    () => formatFiat(new BigNumber(preferredToken?.balanceUsd ?? '0')),
    [formatFiat, preferredToken?.balanceUsd],
  );

  return useMemo(() => {
    if (!hasTokens) {
      return null;
    }

    const rows: PayWithSectionConfig['rows'] = [];

    if (preferredToken) {
      const isPreferredTokenSelected =
        selectedToken?.address.toLowerCase() ===
          preferredToken.address.toLowerCase() &&
        selectedToken.chainId.toLowerCase() ===
          preferredToken.chainId.toLowerCase();

      rows.push({
        id: 'crypto-preferred-token',
        icon: React.createElement(TokenIcon, {
          address: preferredToken.address,
          chainId: preferredToken.chainId,
          variant: TokenIconVariant.Row,
        }),
        title: preferredToken.symbol,
        subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
          balance: preferredTokenBalance,
        }),
        isSelected: isPreferredTokenSelected,
        trailingElement: isPreferredTokenSelected ? 'checkmark' : 'none',
        testID: PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID,
      });
    }

    rows.push({
      id: 'crypto-other-assets',
      icon: React.createElement(Icon, {
        name: IconName.Coin,
        size: IconSize.Md,
        color: IconColor.IconAlternative,
      }),
      title: strings('confirm.pay_with_bottom_sheet.other_assets'),
      subtitle: strings(
        'confirm.pay_with_bottom_sheet.other_assets_description',
      ),
      trailingElement: 'chevron',
      onPress: handleOtherAssetsPress,
      testID: PAY_WITH_CRYPTO_OTHER_ASSETS_ROW_TEST_ID,
    });

    return {
      id: 'crypto',
      title: strings('confirm.pay_with_bottom_sheet.crypto'),
      testID: PAY_WITH_CRYPTO_SECTION_TEST_ID,
      rows,
    };
  }, [
    handleOtherAssetsPress,
    hasTokens,
    preferredToken,
    preferredTokenBalance,
    selectedToken,
  ]);
}
