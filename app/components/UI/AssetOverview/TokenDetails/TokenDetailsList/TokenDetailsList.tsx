import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../../../actions/alert';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import styleSheet from '../TokenDetails.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { TokenDetails } from '../TokenDetails';
import TokenDetailsListItem from '../TokenDetailsListItem';
import { formatAddress } from '../../../../../util/address';

interface TokenDetailsListProps {
  tokenDetails: TokenDetails;
}

const TokenDetailsList: React.FC<TokenDetailsListProps> = ({
  tokenDetails,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(tokenDetails.contractAddress);

    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
  };

  return (
    <View>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('token.token_details')}
      </Text>
      <View style={styles.listWrapper}>
        {tokenDetails.contractAddress && (
          <TokenDetailsListItem
            label={strings('token.contract_address')}
            style={[styles.listItem, styles.firstChild]}
          >
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyAccountToClipboard}
            >
              <Text color={TextColor.Primary} variant={TextVariant.BodySM}>
                {formatAddress(tokenDetails.contractAddress, 'short')}
              </Text>
              <Icon
                name={IconName.Copy}
                size={IconSize.Sm}
                color={IconColor.Primary}
                style={styles.icon}
              />
            </TouchableOpacity>
          </TokenDetailsListItem>
        )}
        {tokenDetails.tokenDecimal && (
          <TokenDetailsListItem
            label={strings('token.token_decimal')}
            value={tokenDetails.tokenDecimal}
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
