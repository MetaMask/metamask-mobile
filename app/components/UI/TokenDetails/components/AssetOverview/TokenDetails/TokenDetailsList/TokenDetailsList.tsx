import React, { useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Icon,
  IconName as DesignSystemIconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import styleSheet from '../TokenDetails.styles';
import ClipboardManager from '../../../../../../../core/ClipboardManager';
import { TokenDetails } from '../TokenDetails';
import TokenDetailsListItem from '../TokenDetailsListItem';
import { formatAddress } from '../../../../../../../util/address';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../../component-library/components/Toast';
import { useTheme } from '../../../../../../../util/theme';

interface TokenDetailsListProps {
  tokenDetails: TokenDetails;
}

const TokenDetailsList: React.FC<TokenDetailsListProps> = ({
  tokenDetails,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const tw = useTailwind();

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(tokenDetails.contractAddress);

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('account_details.account_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
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
