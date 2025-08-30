import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Nft } from '@metamask/assets-controllers';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import TagBase, {
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import CollectibleMedia from '../../../../../UI/CollectibleMedia';
import { useStyles } from '../../../../../hooks/useStyles';
import { AssetType, TokenStandard } from '../../../types/token';
import { useAmountSelectionMetrics } from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useBalance } from '../../../hooks/send/useBalance';
import { useCurrencyConversions } from '../../../hooks/send/useCurrencyConversions';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendContext } from '../../../context/send-context';
import { AmountKeyboard } from './amount-keyboard';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const { asset, updateValue } = useSendContext();
  const { balance } = useBalance();
  const { amountError } = useAmountValidation();
  const [amount, setAmount] = useState('');
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    fiatCurrencySymbol,
    getFiatDisplayValue,
    getNativeDisplayValue,
    getNativeValue,
  } = useCurrencyConversions();
  const isNFT = asset?.standard === TokenStandard.ERC1155;
  const assetSymbol = isNFT
    ? undefined
    : (asset as AssetType)?.ticker ?? (asset as AssetType)?.symbol;
  const assetDisplaySymbol = assetSymbol ?? (isNFT ? 'NFT' : '');
  const { styles, theme } = useStyles(styleSheet, {
    inputError: Boolean(amountError),
    inputLength: amount.length,
    isNFT,
    symbolLength: assetDisplaySymbol.length,
  });
  const {
    setAmountInputMethodManual,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
  } = useAmountSelectionMetrics();
  useRouteParams();

  useEffect(() => {
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode ? getNativeDisplayValue(amount) : getFiatDisplayValue(amount),
    [amount, fiatMode, getFiatDisplayValue, getNativeDisplayValue],
  );

  const updateToNewAmount = useCallback(
    (amt: string) => {
      setAmount(amt);
      updateValue(fiatMode ? getNativeValue(amt) : amt);
      setAmountInputMethodManual();
    },
    [
      fiatMode,
      getNativeValue,
      setAmount,
      setAmountInputMethodManual,
      updateValue,
    ],
  );

  const toggleFiatMode = useCallback(() => {
    if (!fiatMode) {
      setAmountInputTypeToken();
    } else {
      setAmountInputTypeFiat();
    }
    setFiatMode(!fiatMode);
    setAmount('');
    updateValue('');
  }, [
    fiatMode,
    setAmount,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
    setFiatMode,
    updateValue,
  ]);

  const balanceUnit =
    assetSymbol ??
    (parseInt(balance) === 1 ? strings('send.unit') : strings('send.units'));

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {isNFT && (
          <View style={styles.nftImageWrapper}>
            <CollectibleMedia
              style={styles.nftImage}
              collectible={asset as Nft}
              isTokenImage
            />
            <Text variant={TextVariant.BodyMDBold}>{asset?.name}</Text>
            <Text
              color={TextColor.Alternative}
              variant={TextVariant.BodyMDBold}
            >
              {asset?.tokenId}
            </Text>
          </View>
        )}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Input
              cursorColor={theme.colors.primary.default}
              onChangeText={updateToNewAmount}
              style={styles.input}
              testID="send_amount"
              textAlign="right"
              textVariant={TextVariant.DisplayLG}
              value={amount}
              showSoftInputOnFocus={false}
            />
          </View>
          <Text
            color={amountError ? TextColor.Error : TextColor.Alternative}
            numberOfLines={1}
            style={styles.tokenSymbol}
            variant={TextVariant.DisplayLG}
          >
            {fiatMode ? fiatCurrencySymbol : assetDisplaySymbol}
          </Text>
        </View>
        {!isNFT && (
          <TagBase shape={TagShape.Pill} style={styles.currencyTag}>
            <Text color={TextColor.Alternative}>{alternateDisplayValue}</Text>
            <ButtonIcon
              iconColor={IconColor.Alternative}
              iconName={IconName.SwapVertical}
              onPress={toggleFiatMode}
              testID="fiat_toggle"
            />
          </TagBase>
        )}
        <View style={styles.balanceSection}>
          <Text
            color={TextColor.Alternative}
          >{`${balance} ${balanceUnit} ${strings('send.available')}`}</Text>
        </View>
      </View>
      <AmountKeyboard
        amount={amount}
        fiatMode={fiatMode}
        updateAmount={setAmount}
      />
    </View>
  );
};
