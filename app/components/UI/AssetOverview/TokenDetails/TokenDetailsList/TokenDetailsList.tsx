import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Icon,
  IconName as DesignSystemIconName,
  IconSize,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import styleSheet from '../TokenDetails.styles';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { TokenDetails } from '../TokenDetails';
import TokenDetailsListItem from '../TokenDetailsListItem';
import { formatAddress } from '../../../../../util/address';

interface TokenDetailsListProps {
  tokenDetails: TokenDetails;
  onCopyAddress?: () => void;
}

const TokenDetailsList: React.FC<TokenDetailsListProps> = ({
  tokenDetails,
  onCopyAddress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(tokenDetails.contractAddress);
    onCopyAddress?.();

    toast({
      title: strings('account_details.account_copied_to_clipboard'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  };

  return (
    <View>
      <Text variant={TextVariant.HeadingMD} style={tw`py-2`}>
        {strings('token.token_details')}
      </Text>
      <View style={styles.listWrapper}>
        {tokenDetails.contractAddress && (
          <TokenDetailsListItem
            label={strings('token.contract_address')}
            style={[styles.listItem, styles.firstChild]}
          >
            <TouchableOpacity
              style={tw`flex-row items-center gap-1`}
              onPress={copyAccountToClipboard}
            >
              <Text variant={TextVariant.BodySM}>
                {formatAddress(tokenDetails.contractAddress, 'short')}
              </Text>
              <Icon name={DesignSystemIconName.Copy} size={IconSize.Sm} />
            </TouchableOpacity>
          </TokenDetailsListItem>
        )}
        {Boolean(tokenDetails.tokenDecimal) && (
          <TokenDetailsListItem
            label={strings('token.token_decimal')}
            value={tokenDetails.tokenDecimal ?? undefined}
            style={styles.listItem}
          />
        )}
        {tokenDetails.tokenList && (
          <TokenDetailsListItem
            label={strings('token.token_list')}
            value={tokenDetails.tokenList}
            style={[styles.listItemStacked, styles.lastChild]}
          />
        )}
      </View>
    </View>
  );
};

export default TokenDetailsList;
