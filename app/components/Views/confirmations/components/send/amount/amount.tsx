import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Nft } from '@metamask/assets-controllers';
import { TouchableOpacity, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';

import { strings } from '../../../../../../../locales/i18n';
import TagBase, {
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import CollectibleMedia from '../../../../../UI/CollectibleMedia';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import {
  AnimatedNumericText,
  NUMERIC_LAYOUT_TRANSITION,
} from '../../../../../../component-library/components-temp/AnimatedNumericText';
import { useStyles } from '../../../../../hooks/useStyles';
import Device from '../../../../../../util/device';
import { AssetType, TokenStandard } from '../../../types/token';
import { formatToFixedDecimals } from '../../../utils/send';
import { useAmountSelectionMetrics } from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useBalance } from '../../../hooks/send/useBalance';
import { useCurrencyConversions } from '../../../hooks/send/useCurrencyConversions';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendContext } from '../../../context/send-context';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { AmountKeyboard } from './amount-keyboard';
import { AnimatedCursor } from './animated-cursor';
import { getFontSizeForInputLength, styleSheet } from './amount.styles';
import { formatAmountWithCommas } from './amount.utils';
import { InitSendLocation } from '../../../constants/send';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

const IOS_SAFE_AREA_EDGES: Edge[] = ['left', 'right'];
const ANDROID_SAFE_AREA_EDGES: Edge[] = ['left', 'right', 'bottom'];

export const Amount = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { header: renderAmountHeader } = useSendNavbar().Amount;
  const amountHeader = useMemo(
    () => renderAmountHeader(),
    [renderAmountHeader],
  );
  const { location, predefinedAmount } = useParams<{
    location?: string;
    predefinedAmount?: string;
  }>();
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const { asset, updateValue, value } = useSendContext();
  const { balance } = useBalance();
  const { amountError, validateNonEvmAmountAsync } = useAmountValidation();
  const [amount, setAmount] = useState('');
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    conversionSupportedForAsset,
    fiatCurrencySymbol,
    getFiatValue,
    getFiatDisplayValue,
    getNativeValue,
  } = useCurrencyConversions();
  const isNFT =
    asset?.standard === TokenStandard.ERC721 ||
    asset?.standard === TokenStandard.ERC1155;
  const assetSymbol = isNFT
    ? undefined
    : ((asset as AssetType)?.ticker ?? (asset as AssetType)?.symbol);
  const assetDisplaySymbol = assetSymbol ?? (isNFT ? 'NFT' : '');
  const defaultValue = fiatMode ? '0.00' : '0';
  const displayAmount = useMemo(
    () => formatAmountWithCommas(amount.length ? amount : defaultValue),
    [amount, defaultValue],
  );
  // Passing the bucketed font size rather than the raw length keeps the style
  // sheet identity stable between size steps. Keying it on length rebuilt every
  // style on every keypress, which handed each child a new style object and
  // defeated memoisation of the amount's character slots.
  const inputFontSize = getFontSizeForInputLength(
    displayAmount.length + assetDisplaySymbol.length,
  );
  const styleVars = useMemo(() => ({ inputFontSize }), [inputFontSize]);
  const { styles } = useStyles(styleSheet, styleVars);
  const isIos = Device.isIos();
  const { setAmountInputTypeFiat, setAmountInputTypeToken } =
    useAmountSelectionMetrics();
  const { isLoading: isNftLoading } = useRouteParams();
  const hasSeededPredefinedAmountRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const amountLayout = reduceMotion ? undefined : NUMERIC_LAYOUT_TRANSITION;

  useEffect(() => {
    if (predefinedAmount) {
      setFiatMode(false);
      return;
    }
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, predefinedAmount, setFiatMode]);

  // Seed once from navigation params. Do not re-run when the user clears the
  // field — that would restore the QR amount while send-context value stays
  // empty (AmountKeyboard already called updateValue('')).
  useEffect(() => {
    if (!predefinedAmount || hasSeededPredefinedAmountRef.current) {
      return;
    }
    hasSeededPredefinedAmountRef.current = true;
    setAmountInputTypeToken();
    setAmount(predefinedAmount);
    updateValue(predefinedAmount);
  }, [predefinedAmount, setAmountInputTypeToken, updateValue]);

  useEffect(() => {
    if (location && location === InitSendLocation.AssetOverview) {
      navigation.setOptions({
        headerRight: () => null,
      });
    }
  }, [navigation, location]);

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

  const balanceDisplayValue = useMemo(
    () =>
      fiatMode
        ? `${getFiatDisplayValue(balance)} ${strings('send.available')}`
        : `${balance} ${balanceUnit} ${strings('send.available')}`,
    [balance, balanceUnit, fiatMode, getFiatDisplayValue],
  );

  let textColor: TextColor = TextColor.TextDefault;
  if (amountError) {
    textColor = TextColor.ErrorDefault;
  }
  if (!amount.length) {
    textColor = TextColor.TextMuted;
  }

  return (
    <SafeAreaView
      edges={isIos ? IOS_SAFE_AREA_EDGES : ANDROID_SAFE_AREA_EDGES}
      style={styles.container}
    >
      {amountHeader}
      <View style={styles.topSection}>
        {isNFT && (
          <View style={styles.nftImageWrapper}>
            <CollectibleMedia
              style={styles.nftImage}
              collectible={asset as Nft}
              isTokenImage
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {asset?.name}
            </Text>
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
            >
              {asset?.tokenId}
            </Text>
          </View>
        )}
        {isNftLoading && (
          <View style={styles.nftImageWrapper}>
            <Skeleton twClassName="h-[100px] w-[100px] rounded-lg mb-2" />
            <Skeleton twClassName="h-4 w-32 rounded mb-1" />
            <Skeleton twClassName="h-3 w-20 rounded" />
          </View>
        )}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <AnimatedNumericText
              animateFontSize
              color={textColor}
              rollDigits={false}
              style={styles.inputText}
              testID="send_amount"
              value={displayAmount}
              variant={TextVariant.DisplayMd}
            />
            {/* The amount row changes width as digits are typed, which shifts
                everything after it; the shared transition keeps the cursor and
                ticker sliding on the same curve instead of snapping. */}
            <Animated.View layout={amountLayout}>
              <AnimatedCursor animated={!reduceMotion} />
            </Animated.View>
            <Animated.View layout={amountLayout}>
              <Text
                style={styles.inputText}
                color={
                  amountError ? TextColor.ErrorDefault : TextColor.TextMuted
                }
                numberOfLines={1}
                variant={TextVariant.DisplayLg}
              >
                {fiatMode ? fiatCurrencySymbol : assetDisplaySymbol}
              </Text>
            </Animated.View>
          </View>
        </View>
        {conversionSupportedForAsset && (
          <TouchableOpacity onPress={toggleFiatMode} testID="fiat_toggle">
            <TagBase shape={TagShape.Pill} style={styles.currencyTag}>
              <Text
                color={TextColor.TextAlternative}
                testID="send_amount_alternate"
              >
                {alternateDisplayValue}
              </Text>
              <Icon
                color={IconColor.IconAlternative}
                name={IconName.SwapVertical}
                size={IconSize.Md}
              />
            </TagBase>
          </TouchableOpacity>
        )}
        {isNftLoading ? (
          <Skeleton twClassName="h-4 w-40 rounded self-center mt-4" />
        ) : (
          <Text
            color={TextColor.TextAlternative}
            style={styles.balanceText}
            testID="send_balance"
          >
            {balanceDisplayValue}
          </Text>
        )}
      </View>
      <AmountKeyboard
        amount={amount}
        amountError={amountError}
        fiatMode={fiatMode}
        getFiatValue={getFiatValue}
        getNativeValue={getNativeValue}
        updateAmount={setAmount}
        validateNonEvmAmountAsync={validateNonEvmAmountAsync}
      />
    </SafeAreaView>
  );
};
