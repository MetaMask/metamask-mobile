import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../../actions/alert';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Title from '../../../Base/Title';
import styleSheet from './TokenDetails.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TokenDetails } from './TokenDetails';

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
    <View style={styles.wrapper}>
      <Title style={styles.title}>{strings('token.token_details')}</Title>
      <View style={styles.listWrapper}>
        {tokenDetails.contractAddress && (
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>
              {strings('token.contract_address')}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyAccountToClipboard}
            >
              <Text color={TextColor.Primary} variant={TextVariant.BodySM}>
                {tokenDetails.contractAddress}
              </Text>
              <Icon
                name={IconName.Copy}
                size={IconSize.Sm}
                color={IconColor.Primary}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>
        )}
        {tokenDetails.tokenDecimal && (
          <View style={styles.listItem}>
            <Text>{strings('token.token_decimal')}</Text>
            <Text>{tokenDetails.tokenDecimal}</Text>
          </View>
        )}
        {tokenDetails.tokenList && (
          <View style={[styles.listItemStacked, styles.lastChild]}>
            <Text>{strings('token.token_list')}</Text>
            <Text>{tokenDetails.tokenList}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TokenDetailsList;
