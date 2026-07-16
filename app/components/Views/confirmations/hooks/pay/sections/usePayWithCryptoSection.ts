import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

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
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { markPerpsPaymentTokenSelection } from '../../../../../UI/Perps/utils/perpsPaymentTokenSelection';
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../../utils/transaction';
import {
  isMatchingPayToken,
  resolvePreferredPayToken,
} from '../../../utils/transaction-pay';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
import { SetPayTokenRequest } from '../useAutomaticTransactionPayToken';
import { useLastUsedPaymentMethod } from '../useLastUsedPaymentMethod';
import { usePayWithNoFeeToken } from '../usePayWithNoFeeToken';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { usePayWithSelectedToken } from '../usePayWithSelectedToken';
import { useTransactionPayFiatPayment } from '../useTransactionPayData';
import { useTransactionPayToken } from '../useTransactionPayToken';
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
export const PAY_WITH_CRYPTO_NO_FEE_TOKEN_ROW_TEST_ID =
  'pay-with-crypto-section-no-fee-token-row';
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
  const {
    onPaymentTokenChange: onPredictPaymentTokenChange,
    isPredictBalanceSelected,
  } = usePredictPaymentToken();
  const { renderLastUsedTag } = useLastUsedPaymentMethod();
  const { noFeeToken, renderNoFeeTagForToken } = usePayWithNoFeeToken({
    excludeToken: preferredToken
      ? { address: preferredToken.address, chainId: preferredToken.chainId }
      : undefined,
  });
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);
  const isPredictDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);
  const isPerpsBalanceImplicitlySelected =
    isPerpsDepositAndOrder && isPerpsBalanceSelected;
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyAccountSelected =
    paymentOverride === PaymentOverride.MoneyAccount;
  const isPredictBalanceImplicitlySelected =
    isPredictDepositAndOrder && isPredictBalanceSelected;
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const isDedicatedSectionOwningSelection =
    isPerpsBalanceImplicitlySelected ||
    isPredictBalanceImplicitlySelected ||
    hasFiatPaymentSelected ||
    isMoneyAccountSelected;

  const clearPaymentOverride = useClearPaymentOverride();

  const isDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsDeposit,
    TransactionType.predictDeposit,
  ]);
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const isMoneyWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  // No-fee tokens only apply to Money Account flows (not perps/predict). The
  // dedicated no-fee suggestion row is deposit-only; per-row tags also show on
  // Money withdrawals, where the picker token is what you receive.
  const shouldShowNoFeeTokens = isMoneyDeposit;
  const showNoFeeRowTags = isMoneyDeposit || isMoneyWithdraw;

  const handleOtherAssetsPress = useCallback(() => {
    clearPaymentOverride();
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      dismissOnSelectCount: 2,
    });
  }, [clearPaymentOverride, navigation]);

  const handlePreferredTokenPress = useCallback(() => {
    if (!preferredToken) {
      return;
    }
    const target = {
      address: preferredToken.address,
      chainId: preferredToken.chainId,
    };
    if (isPerpsDepositAndOrder) {
      // an explicit row press is a selection even when the pay token
      // is unchanged (re-selecting the current preferred token).
      markPerpsPaymentTokenSelection();
      onPerpsPaymentTokenChange(target);
    } else if (isPredictDepositAndOrder) {
      onPredictPaymentTokenChange(target);
      setPayToken(target);
    } else {
      setPayToken(target);
    }
    clearPaymentOverride();
    navigation.goBack();
  }, [
    clearPaymentOverride,
    isPerpsDepositAndOrder,
    isPredictDepositAndOrder,
    navigation,
    onPerpsPaymentTokenChange,
    onPredictPaymentTokenChange,
    preferredToken,
    setPayToken,
  ]);

  const handleNoFeeTokenPress = useCallback(() => {
    if (!noFeeToken) {
      return;
    }
    const target = {
      address: noFeeToken.address,
      chainId: noFeeToken.chainId,
    };
    if (isPerpsDepositAndOrder) {
      // explicit row press counts as a selection (see above).
      markPerpsPaymentTokenSelection();
      onPerpsPaymentTokenChange(target);
    } else if (isPredictDepositAndOrder) {
      onPredictPaymentTokenChange(target);
      setPayToken(target);
    } else {
      setPayToken(target);
    }
    clearPaymentOverride();
    navigation.goBack();
  }, [
    clearPaymentOverride,
    isPerpsDepositAndOrder,
    isPredictDepositAndOrder,
    navigation,
    noFeeToken,
    onPerpsPaymentTokenChange,
    onPredictPaymentTokenChange,
    setPayToken,
  ]);

  const preferredTokenBalance = useMemo(
    () => formatFiat(new BigNumber(preferredToken?.balanceUsd ?? '0')),
    [formatFiat, preferredToken?.balanceUsd],
  );

  const noFeeTokenBalance = useMemo(
    () => formatFiat(new BigNumber(noFeeToken?.balanceUsd ?? '0')),
    [formatFiat, noFeeToken?.balanceUsd],
  );

  const selectedTokenBalance = useMemo(
    () => formatFiat(new BigNumber(selectedTokenDisplay?.balanceUsd ?? '0')),
    [formatFiat, selectedTokenDisplay?.balanceUsd],
  );

  return useMemo(() => {
    if (!hasTokens) {
      return null;
    }

    const tokenRows: (PayWithRowConfig & { _balanceUsd: number })[] = [];

    const isPreferredTokenMoneyAccountToken =
      isMoneyAccountSelected &&
      isMatchingPayToken(preferredToken, {
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MONAD,
      });

    if (preferredToken && !isPreferredTokenMoneyAccountToken) {
      // Suppress the checkmark when another section owns the selection
      // (perps/predict balance or fiat). The flag flips back to false when the
      // user explicitly picks a crypto token via "Other assets".
      const isPreferredTokenSelected =
        !isDedicatedSectionOwningSelection &&
        isMatchingPayToken(selectedToken, preferredToken);

      const preferredAddress = preferredToken.address as Hex;
      const preferredChainId = preferredToken.chainId as Hex;

      tokenRows.push({
        _balanceUsd: parseFloat(preferredToken.balanceUsd) || 0,
        id: 'crypto-preferred-token',
        icon: React.createElement(TokenIcon, {
          address: preferredToken.address,
          chainId: preferredToken.chainId,
          variant: TokenIconVariant.Row,
        }),
        title: preferredToken.symbol,
        subtitle: isDeposit
          ? strings('confirm.pay_with_bottom_sheet.available_balance', {
              balance: preferredTokenBalance,
            })
          : preferredTokenBalance,
        isSelected: isPreferredTokenSelected,
        tagRenderers: [
          () =>
            showNoFeeRowTags
              ? renderNoFeeTagForToken(preferredAddress, preferredChainId, {
                  testID: `${PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID}-no-fee-tag`,
                })
              : null,
          () =>
            renderLastUsedTag(preferredAddress, preferredChainId, {
              testID: `${PAY_WITH_CRYPTO_PREFERRED_TOKEN_ROW_TEST_ID}-last-used-tag`,
            }),
        ],
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
      const selectedAddress = selectedTokenDisplay.address as Hex;
      const selectedChainId = selectedTokenDisplay.chainId as Hex;

      tokenRows.push({
        _balanceUsd: parseFloat(selectedTokenDisplay.balanceUsd) || 0,
        id: 'crypto-selected-token',
        icon: React.createElement(TokenIcon, {
          address: selectedTokenDisplay.address,
          chainId: selectedTokenDisplay.chainId,
          variant: TokenIconVariant.Row,
        }),
        title: selectedTokenDisplay.symbol,
        subtitle: isDeposit
          ? strings('confirm.pay_with_bottom_sheet.available_balance', {
              balance: selectedTokenBalance,
            })
          : selectedTokenBalance,
        isSelected: true,
        tagRenderers: [
          () =>
            showNoFeeRowTags
              ? renderNoFeeTagForToken(selectedAddress, selectedChainId, {
                  testID: `${PAY_WITH_CRYPTO_SELECTED_TOKEN_ROW_TEST_ID}-no-fee-tag`,
                })
              : null,
          () =>
            renderLastUsedTag(selectedAddress, selectedChainId, {
              testID: `${PAY_WITH_CRYPTO_SELECTED_TOKEN_ROW_TEST_ID}-last-used-tag`,
            }),
        ],
        trailingElement: 'checkmark',
        testID: PAY_WITH_CRYPTO_SELECTED_TOKEN_ROW_TEST_ID,
      });
    }

    const noFeeTokenDuplicatesSelectedRow =
      isSelectedDistinctFromAutomatic &&
      selectedTokenDisplay &&
      isMatchingPayToken(selectedTokenDisplay, noFeeToken);

    if (
      shouldShowNoFeeTokens &&
      noFeeToken &&
      !isDedicatedSectionOwningSelection &&
      !noFeeTokenDuplicatesSelectedRow
    ) {
      const isNoFeeTokenSelected = isMatchingPayToken(
        selectedToken,
        noFeeToken,
      );

      const noFeeAddress = noFeeToken.address;
      const noFeeChainId = noFeeToken.chainId;

      tokenRows.push({
        _balanceUsd: parseFloat(noFeeToken.balanceUsd) || 0,
        id: 'crypto-no-fee-token',
        icon: React.createElement(TokenIcon, {
          address: noFeeToken.address,
          chainId: noFeeToken.chainId,
          variant: TokenIconVariant.Row,
        }),
        title: noFeeToken.symbol,
        subtitle: isDeposit
          ? strings('confirm.pay_with_bottom_sheet.available_balance', {
              balance: noFeeTokenBalance,
            })
          : noFeeTokenBalance,
        isSelected: isNoFeeTokenSelected,
        tagRenderers: [
          () =>
            renderNoFeeTagForToken(noFeeAddress, noFeeChainId, {
              testID: `${PAY_WITH_CRYPTO_NO_FEE_TOKEN_ROW_TEST_ID}-no-fee-tag`,
            }),
        ],
        trailingElement: isNoFeeTokenSelected ? 'checkmark' : 'none',
        onPress: handleNoFeeTokenPress,
        testID: PAY_WITH_CRYPTO_NO_FEE_TOKEN_ROW_TEST_ID,
      });
    }

    tokenRows.sort((a, b) => b._balanceUsd - a._balanceUsd);

    const rows: PayWithRowConfig[] = tokenRows.map(
      ({ _balanceUsd: _, ...row }) => row,
    );

    rows.push({
      id: 'crypto-other-assets',
      icon: React.createElement(Icon, {
        name: IconName.Coin,
        size: IconSize.Md,
        color: IconColor.IconAlternative,
      }),
      title: strings('confirm.pay_with_bottom_sheet.other_assets'),
      subtitle: strings(
        isWithdraw
          ? 'confirm.pay_with_bottom_sheet.other_assets_receive_description'
          : 'confirm.pay_with_bottom_sheet.other_assets_description',
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
    handleNoFeeTokenPress,
    handleOtherAssetsPress,
    handlePreferredTokenPress,
    hasTokens,
    isDedicatedSectionOwningSelection,
    isDeposit,
    isMoneyAccountSelected,
    isSelectedDistinctFromAutomatic,
    isWithdraw,
    noFeeToken,
    noFeeTokenBalance,
    preferredToken,
    preferredTokenBalance,
    renderLastUsedTag,
    renderNoFeeTagForToken,
    selectedToken,
    selectedTokenBalance,
    selectedTokenDisplay,
    shouldShowNoFeeTokens,
    showNoFeeRowTags,
  ]);
}
