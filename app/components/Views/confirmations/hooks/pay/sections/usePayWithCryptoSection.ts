import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import { strings } from '../../../../../../../locales/i18n';
import { useParams } from '../../../../../../util/navigation/navUtils';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TokenIcon, TokenIconVariant } from '../../../components/token-icon';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useIsPerpsBalanceSelected } from '../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { hasTransactionType } from '../../../utils/transaction';
import {
  isMatchingPayToken,
  resolvePreferredPayToken,
} from '../../../utils/transaction-pay';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
import { SetPayTokenRequest } from '../useAutomaticTransactionPayToken';
import { useLastUsedPaymentMethod } from '../useLastUsedPaymentMethod';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { usePayWithSelectedToken } from '../usePayWithSelectedToken';
import { useTransactionPayFiatPayment } from '../useTransactionPayData';
import { useTransactionPayToken } from '../useTransactionPayToken';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { useClearPaymentOverride } from './useClearPaymentOverride';

interface PayWithCryptoSectionParams {
  preferredPaymentToken?: SetPayTokenRequest;
}

export const PAY_WITH_CRYPTO_SECTION_TEST_ID = 'pay-with-section-crypto';
export const PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID =
  'pay-with-crypto-section-preferred-token-row';
export const PAY_WITH_CRYPTO_SELECTED_TOKEN_ROW_TEST_ID =
  'pay-with-crypto-section-selected-token-row';
export const PAY_WITH_CRYPTO_OTHER_ASSETS_ROW_TEST_ID =
  'pay-with-crypto-section-other-assets-row';

export function usePayWithCryptoSection(): PayWithSectionConfig | null {
  const navigation = useNavigation();
  const { preferredPaymentToken } = useParams<PayWithCryptoSectionParams>({});
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const transactionMeta = useTransactionMetadataRequest();
  const resolvedPreferredToken = useMemo(
    () =>
      resolvePreferredPayToken({
        override: preferredPaymentToken,
        transactionMeta,
      }),
    [preferredPaymentToken, transactionMeta],
  );
  const { hasTokens, preferredToken, selectedToken } = usePayWithPreferredToken(
    {
      preferredToken: resolvedPreferredToken,
    },
  );
  const {
    isSelectedDistinctFromAutomatic,
    selectedToken: selectedTokenDisplay,
  } = usePayWithSelectedToken({ preferredToken: resolvedPreferredToken });
  const { setPayToken } = useTransactionPayToken();
  const { onPaymentTokenChange: onPerpsPaymentTokenChange } =
    usePerpsPaymentToken();
  const { isLastUsed } = useLastUsedPaymentMethod();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);
  const isPerpsBalanceImplicitlySelected =
    isPerpsDepositAndOrder && isPerpsBalanceSelected;
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const isDedicatedSectionOwningSelection =
    isPerpsBalanceImplicitlySelected ||
    hasFiatPaymentSelected ||
    isMoneyAccountSelected;

  const clearPaymentOverride = useClearPaymentOverride();

  const handleOtherAssetsPress = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      dismissOnSelectCount: 2,
    });
  }, [navigation]);

  const handlePreferredTokenPress = useCallback(() => {
    if (!preferredToken) {
      return;
    }
    const target = {
      address: preferredToken.address,
      chainId: preferredToken.chainId,
    };
    if (isPerpsDepositAndOrder) {
      onPerpsPaymentTokenChange(target);
    } else {
      setPayToken(target);
    }
    clearPaymentOverride();
    navigation.goBack();
  }, [
    clearPaymentOverride,
    isPerpsDepositAndOrder,
    navigation,
    onPerpsPaymentTokenChange,
    preferredToken,
    setPayToken,
  ]);

  const preferredTokenBalance = useMemo(
    () => formatFiat(new BigNumber(preferredToken?.balanceUsd ?? '0')),
    [formatFiat, preferredToken?.balanceUsd],
  );

  const selectedTokenBalance = useMemo(
    () => formatFiat(new BigNumber(selectedTokenDisplay?.balanceUsd ?? '0')),
    [formatFiat, selectedTokenDisplay?.balanceUsd],
  );

  return useMemo(() => {
    if (!hasTokens) {
      return null;
    }

    const rows: PayWithRowConfig[] = [];

    const isPreferredTokenMoneyAccountToken =
      isMoneyAccountSelected &&
      isMatchingPayToken(preferredToken, {
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MONAD,
      });

    if (preferredToken && !isPreferredTokenMoneyAccountToken) {
      // When a dedicated section "owns" the selection (Perps balance is the
      // implicit default in a perpsDepositAndOrder flow, OR a fiat payment
      // method has been picked), the Crypto section's preferred-token row must
      // not render a misleading checkmark, and the user-selected-token row is
      // hidden below. When the user explicitly picks a crypto token via "Other
      // assets" in a perps flow, `PerpsController` also stores it as
      // `selectedPaymentToken`, and we honor that selection with a checkmark
      // (handled by `isPerpsBalanceImplicitlySelected` being false in that
      // case).
      const isPreferredTokenSelected =
        !isDedicatedSectionOwningSelection &&
        isMatchingPayToken(selectedToken, preferredToken);

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
        isLastUsed: isLastUsed(preferredToken.address, preferredToken.chainId),
        trailingElement: isPreferredTokenSelected ? 'checkmark' : 'none',
        onPress: handlePreferredTokenPress,
        testID: PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID,
      });
    }

    if (
      isSelectedDistinctFromAutomatic &&
      selectedTokenDisplay &&
      !isDedicatedSectionOwningSelection
    ) {
      rows.push({
        id: 'crypto-selected-token',
        icon: React.createElement(TokenIcon, {
          address: selectedTokenDisplay.address,
          chainId: selectedTokenDisplay.chainId,
          variant: TokenIconVariant.Row,
        }),
        title: selectedTokenDisplay.symbol,
        subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
          balance: selectedTokenBalance,
        }),
        isSelected: true,
        isLastUsed: isLastUsed(
          selectedTokenDisplay.address,
          selectedTokenDisplay.chainId,
        ),
        trailingElement: 'checkmark',
        testID: PAY_WITH_CRYPTO_SELECTED_TOKEN_ROW_TEST_ID,
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
    handlePreferredTokenPress,
    hasTokens,
    isDedicatedSectionOwningSelection,
    isLastUsed,
    isMoneyAccountSelected,
    isSelectedDistinctFromAutomatic,
    preferredToken,
    preferredTokenBalance,
    selectedToken,
    selectedTokenBalance,
    selectedTokenDisplay,
  ]);
}
