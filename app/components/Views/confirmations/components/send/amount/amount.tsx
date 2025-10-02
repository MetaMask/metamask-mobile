import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Nft } from '@metamask/assets-controllers';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import Icon, {
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
import { formatToFixedDecimals } from '../../../utils/send';
import { useAmountSelectionMetrics } from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useBalance } from '../../../hooks/send/useBalance';
import { useCurrencyConversions } from '../../../hooks/send/useCurrencyConversions';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendContext } from '../../../context/send-context';
import { AmountKeyboard } from './amount-keyboard';
import { AnimatedCursor } from './animated-cursor';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const { asset, value } = useSendContext();
  const { balance } = useBalance();
  const { amountError } = useAmountValidation();
  const [amount, setAmount] = useState('');
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    conversionSupportedForAsset,
    fiatCurrencySymbol,
    getFiatValue,
    getFiatDisplayValue,
  } = useCurrencyConversions();
  const isNFT = asset?.standard === TokenStandard.ERC1155;
  const assetSymbol = isNFT
    ? undefined
    : (asset as AssetType)?.ticker ?? (asset as AssetType)?.symbol;
  const assetDisplaySymbol = assetSymbol ?? (isNFT ? 'NFT' : '');
  const { styles } = useStyles(styleSheet, {
    contentLength: amount.length + assetDisplaySymbol.length,
    isNFT,
  });
  const { setAmountInputTypeFiat, setAmountInputTypeToken } =
    useAmountSelectionMetrics();
  useRouteParams();

  useEffect(() => {
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode
        ? `${formatToFixedDecimals(value ?? '0', 5)} ${assetSymbol}`
        : getFiatDisplayValue(amount),
    [amount, assetSymbol, fiatMode, getFiatDisplayValue, value],
  );

  const toggleFiatMode = useCallback(() => {
    const newFiatMode = !fiatMode;
    if (newFiatMode) {
      setAmountInputTypeFiat();
    } else {
      setAmountInputTypeToken();
    }
    setFiatMode(newFiatMode);
    if (value === undefined || value === '') {
      setAmount('');
    } else {
      setAmount(newFiatMode ? getFiatValue(value) : value);
    }
  }, [
    fiatMode,
    getFiatValue,
    setAmount,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
    setFiatMode,
    value,
  ]);

  const balanceUnit =
    assetSymbol ??
    (parseInt(balance) === 1 ? strings('send.unit') : strings('send.units'));

  const defaultValue = fiatMode ? '0.00' : '0';
  let textColor = TextColor.Default;
  if (amountError) {
    textColor = TextColor.Error;
  }
  if (!amount.length) {
    textColor = TextColor.Muted;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
            <Text
              color={textColor}
              style={styles.inputText}
              numberOfLines={1}
              variant={TextVariant.DisplayMD}
              adjustsFontSizeToFit
              testID="send_amount"
            >
              {amount?.length ? amount : defaultValue}
            </Text>
            <AnimatedCursor />
            <Text
              style={styles.inputText}
              color={amountError ? TextColor.Error : TextColor.Muted}
              numberOfLines={1}
              variant={TextVariant.DisplayLG}
            >
              {fiatMode ? fiatCurrencySymbol : assetDisplaySymbol}
            </Text>
          </View>
        </View>
        {conversionSupportedForAsset && (
          <TouchableOpacity onPress={toggleFiatMode} testID="fiat_toggle">
            <TagBase shape={TagShape.Pill} style={styles.currencyTag}>
              <Text color={TextColor.Alternative}>{alternateDisplayValue}</Text>
              <Icon
                color={IconColor.Alternative}
                name={IconName.SwapVertical}
              />
            </TagBase>
          </TouchableOpacity>
        )}
      </View>
      <View>
        <View style={styles.balanceSection}>
          <Text
            color={TextColor.Alternative}
          >{`${balance} ${balanceUnit} ${strings('send.available')}`}</Text>
        </View>
        <AmountKeyboard
          amount={amount}
          fiatMode={fiatMode}
          updateAmount={setAmount}
        />
      </View>
    </ScrollView>
  );
};
