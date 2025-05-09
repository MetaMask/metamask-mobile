import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import NetworkAssetLogo from '../../../../../../UI/NetworkAssetLogo';
import { strings } from '../../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenDetails } from '../../../../hooks/useTokenDetails';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import { useFlatConfirmation } from '../../../../hooks/ui/useFlatConfirmation';
import useNetworkInfo from '../../../../hooks/useNetworkInfo';
import { isNativeToken } from '../../../../utils/token';
import { TooltipModal } from '../../../UI/Tooltip/Tooltip';
import styleSheet from './token-hero.styles';
import { useDisplayName } from '../../../../../../hooks/DisplayName/useDisplayName';
import { NameType } from '../../../../../../UI/Name/Name.types';

// todo:
// - move AvatarTokenNetworkWithBadge presentation logic to it's own component
// - add conditional logic to fiat value. e.g. should hide if testnet
// - fix inconsistent fiat value. can be off by pennies
// - tokenlist sometimes only has 0x0000000000000000000000000000000000000000
// - style: confirm if we'd like to add the symbol in the modal precise token amount text
// - style: confirm fallback avatar - non-bold + background color
const AvatarTokenNetwork = () => {
  const transactionMeta =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { chainId } = transactionMeta;

  const isNative = isNativeToken(transactionMeta);

  const { image, name: symbol } = useDisplayName({
    preferContractSymbol: true,
    type: NameType.EthereumAddress,
    value: transactionMeta?.txParams?.to ?? '',
    variation: chainId ?? '',
  });

  return isNative ? (
    <NetworkAssetLogo
      chainId={chainId ?? ''}
      ticker={symbol ?? ''}
      big={true}
      biggest={true}
      testID={`avatar-token-network-${symbol}-${chainId}`}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : undefined}
      name={symbol ?? ''}
      size={AvatarSize.Xl}
    />
  );
};

const AvatarTokenNetworkWithBadge = ({
  styles,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { networkName, networkImage } = useNetworkInfo(
    transactionMeta?.chainId,
  );

  return (
    <View style={styles.networkAndTokenContainer}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            imageSource={networkImage}
            variant={BadgeVariant.Network}
            name={networkName}
          />
        }
      >
        <AvatarTokenNetwork />
      </BadgeWrapper>
    </View>
  );
};

const AssetAmount = ({
  tokenAmountDisplayValue,
  tokenSymbol,
  styles,
  setIsModalVisible,
}: {
  tokenAmountDisplayValue?: string;
  tokenSymbol?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  setIsModalVisible: ((isModalVisible: boolean) => void) | null;
}) => (
  <View style={styles.assetAmountContainer}>
    {setIsModalVisible ? (
      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
          {tokenAmountDisplayValue} {tokenSymbol}
        </Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.assetAmountText} variant={TextVariant.HeadingLG}>
        {tokenAmountDisplayValue} {tokenSymbol}
      </Text>
    )}
  </View>
);

const AssetFiatConversion = ({
  fiatDisplayValue,
  styles,
}: {
  fiatDisplayValue?: string;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => {
  return fiatDisplayValue ? (
    <Text style={styles.assetFiatConversionText} variant={TextVariant.BodyMD}>
      {fiatDisplayValue}
    </Text>
  ) : null;
};

const TokenHero = ({ amountWei }: { amountWei?: string }) => {
  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);

  const tokenDetails = useTokenDetails();
  const { symbol } = tokenDetails;
  const { tokenAmountValue, tokenAmountDisplayValue, fiatDisplayValue } =
    useTokenValues({ amountWei });

  const displayTokenAmountIsRounded =
    tokenAmountValue !== tokenAmountDisplayValue;

  return (
    <View style={styles.container}>
      <AvatarTokenNetworkWithBadge styles={styles} />
      <AssetAmount
        tokenAmountDisplayValue={tokenAmountDisplayValue}
        tokenSymbol={symbol}
        styles={styles}
        setIsModalVisible={
          displayTokenAmountIsRounded ? setIsModalVisible : null
        }
      />
      <AssetFiatConversion
        fiatDisplayValue={fiatDisplayValue}
        styles={styles}
      />
      {displayTokenAmountIsRounded && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={tokenAmountValue}
          title={strings('send.amount')}
          tooltipTestId="token-hero-amount"
        />
      )}
    </View>
  );
};

export default TokenHero;
