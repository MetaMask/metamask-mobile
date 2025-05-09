import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ImageSourcePropType,
} from 'react-native';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { Collection } from '@metamask/assets-controllers';
import { TransactionType } from '@metamask/transaction-controller';
import { toChecksumAddress } from 'ethereumjs-util';

import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import TokenIcon from '../../../../../../UI/Swaps/components/TokenIcon';
import { useSelector } from 'react-redux';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import styleSheet from './token-hero.styles';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { parseStandardTokenTransactionData } from '../../../../utils/transaction';
import { selectERC20TokensByChain } from '../../../../../../../selectors/tokenListController';
import { useAsyncResult } from '../../../../../../hooks/useAsyncResult';
import Engine from '../../../../../../../core/Engine';
import { getTokenDetails } from '../../../../../../../util/address';
import { hexWEIToDecETH } from '../../../../../../../util/conversions';
import useFiatFormatter from '../../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { RootState } from '../../../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../../../selectors/networkController';
import { selectContractExchangeRatesByChainId } from '../../../../../../../selectors/tokenRatesController';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import AvatarNetwork from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';

const NetworkAndTokenImage = ({
  styles,
  image,
  networkImage,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  image: string;
  networkImage: ImageSourcePropType;
}) => (
  <View style={styles.networkAndTokenContainer}>
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        image ? (
          <AvatarNetwork size={AvatarSize.Xs} imageSource={networkImage} />
        ) : null
      }
    >
      {image ? (
        <TokenIcon big icon={image} />
      ) : (
        <AvatarNetwork size={AvatarSize.Xl} imageSource={networkImage} />
      )}
    </BadgeWrapper>
  </View>
);

const AssetAmount = ({
  amount,
  name,
  styles,
  setIsModalVisible,
}: {
  amount: string;
  name: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  setIsModalVisible: ((isModalVisible: boolean) => void) | null;
}) => (
  <View style={styles.assetAmountContainer}>
    {setIsModalVisible ? (
      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {amount} {name}
        </Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
        {amount} {name}
      </Text>
    )}
  </View>
);

const AssetFiatConversion = ({
  fiatDisplayValue,
  styles,
}: {
  fiatDisplayValue: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
  <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
    {fiatDisplayValue}
  </Text>
);

const useTokenTransferValues = () => {
  const { NftController } = Engine.context;
  const fiatFormatter = useFiatFormatter();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionType = transactionMetadata?.type;
  const networkClientId = transactionMetadata?.networkClientId;
  const txParams = transactionMetadata?.txParams;
  const chainId = transactionMetadata?.chainId;
  const to = txParams?.to as string;
  const transferData = parseStandardTokenTransactionData(txParams?.data);
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId as Hex),
  );
  const erc20TokensByChain = useSelector(selectERC20TokensByChain);
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex),
  );
  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const { value: tokenDetails } = useAsyncResult(async () => {
    const tokenDetails = await getTokenDetails(
      to,
      undefined,
      undefined,
      networkClientId,
    );
    return tokenDetails;
  }, []);
  const { value: collectionsMetadata } = useAsyncResult(async () => {
    const collectionsResult = await NftController.getNFTContractInfo(
      [to],
      chainId as Hex,
    );

    const collectionsData = collectionsResult.collections.reduce<
      Record<string, Collection>
    >((acc, collection) => {
      acc[to] = {
        name: collection?.name,
        image: collection?.image,
        isSpam: collection?.isSpam,
      };
      return acc;
    }, {});

    return collectionsData;
  }, []);

  let amount = null;
  let tokenAddress = null; // If no tokenAddress, it's a native transaction
  let tokenFormattedFiatValue = null;
  let tokenId = null;
  let tokenImage = null;
  let tokenName = null;
  let networkImage = getNetworkImageSource({ chainId: chainId as Hex });

  switch (transactionType) {
    case TransactionType.simpleSend: {
      // Native
      const decimalAmount = hexWEIToDecETH(txParams?.value as Hex);
      const amountBN = new BigNumber(decimalAmount);
      const nativeConversionRateInBN = new BigNumber(
        nativeConversionRate as number,
      );
      const preciseFiatValue = amountBN.times(nativeConversionRateInBN);

      amount = decimalAmount.toString();
      tokenFormattedFiatValue = fiatFormatter(preciseFiatValue);
      tokenName = nativeCurrency;
      break;
    }
    case TransactionType.tokenMethodTransfer: {
      // ERC20
      const amountBN = new BigNumber(transferData?.args[1].toString());

      const { name: erc20TokenName, iconUrl: image } =
        erc20TokensByChain[chainId as Hex]?.data?.[txParams?.to as string] ??
        {};

      const { decimals } = tokenDetails ?? {};

      const divisor = new BigNumber(10).pow(decimals ?? 18);
      const formattedAmountBN = new BigNumber(amountBN.toString()).dividedBy(
        divisor,
      );

      const formattedAmount = formattedAmountBN.toString();

      const nativeConversionRateInBN = new BigNumber(
        nativeConversionRate as number,
      );

      const contractExchangeRateInNative =
        contractExchangeRates?.[
          toChecksumAddress(txParams?.to as string) as Hex
        ].price ?? 0;

      const contractExchangeRateInNativeBN = new BigNumber(
        contractExchangeRateInNative,
      );

      const tokenValueInNative = formattedAmountBN.multipliedBy(
        contractExchangeRateInNativeBN,
      );

      const preciseFiatValue = tokenValueInNative.times(
        nativeConversionRateInBN,
      );

      amount = formattedAmount;
      tokenAddress = txParams?.to;
      tokenImage = image;
      tokenName = erc20TokenName;
      tokenFormattedFiatValue = fiatFormatter(preciseFiatValue);
      break;
    }
    case TransactionType.tokenMethodTransferFrom: {
      // ERC721 - ERC1155
      tokenAddress = txParams?.to;
      tokenId = transferData?.args[transferData?.args.length - 1].toString();
      tokenImage = collectionsMetadata?.[to]?.image;
      tokenName = collectionsMetadata?.[to]?.name;
      break;
    }
    case TransactionType.contractInteraction: {
      // TODO: Staking use case
      break;
    }
    default: {
      // TODO: We should be show unknown token image and name
      break;
    }
  }

  console.log('---------------------------');
  console.log('amount', amount);
  console.log('networkImage', networkImage);
  console.log('transactionType', transactionType);
  console.log('tokenAddress', tokenAddress);
  console.log('tokenId', tokenId);
  console.log('tokenName', tokenName);
  console.log('tokenImage', tokenImage);
  console.log('tokenFormattedFiatValue', tokenFormattedFiatValue);
  console.log('---------------------------');

  return {
    amount,
    networkImage,
    tokenAddress,
    tokenFormattedFiatValue,
    tokenId,
    tokenImage,
    tokenName,
  };
};

const TokenHero = () => {
  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  const {
    amount,
    networkImage,
    tokenFormattedFiatValue,
    tokenId, // TODO: Will be displayed for NFTs instead of fiat
    tokenImage,
    tokenName,
  } = useTokenTransferValues();

  return (
    <View style={styles.container}>
      <NetworkAndTokenImage
        image={tokenImage ?? ''}
        networkImage={networkImage}
        styles={styles}
      />
      <AssetAmount
        amount={amount ?? ''}
        name={tokenName ?? ''}
        styles={styles}
        setIsModalVisible={() => {}}
      />
      <AssetFiatConversion
        fiatDisplayValue={tokenFormattedFiatValue ?? ''}
        styles={styles}
      />
    </View>
  );
};

export default TokenHero;
