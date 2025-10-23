import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { KeyValueRowStubs } from '../../../../../component-library/components-temp/KeyValueRow';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import {
  selectDestAddress,
  selectIsSwap,
} from '../../../../../core/redux/slices/bridge';
import createStyles from './QuoteDetailsRecipientKeyValueRow.styles';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { useRecipientDisplayData } from '../../hooks/useRecipientDisplayData';
import { shortenString } from '../../../../../util/notifications';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

const QuoteDetailsRecipientKeyValueRow = () => {
  const styles = createStyles();
  const navigation = useNavigation();
  const isSwap = useSelector(selectIsSwap);
  const destAddress = useSelector(selectDestAddress);

  // Get the display name and wallet name for the destination account
  const {
    destinationDisplayName,
    destinationWalletName,
    destinationAccountAddress,
  } = useRecipientDisplayData();

  const handleRecipientPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECIPIENT_SELECTOR_MODAL,
    });
  };

  if (isSwap || !destAddress) {
    return null;
  }

  return (
    <KeyValueRowStubs.Root>
      <Box style={styles.recipientFieldSection}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('bridge.recipient')}
        </Text>
      </Box>
      <Box
        style={styles.recipientValueSection}
        alignItems={BoxAlignItems.End}
        justifyContent={BoxJustifyContent.End}
      >
        <TouchableOpacity
          onPress={handleRecipientPress}
          activeOpacity={0.6}
          testID="recipient-selector-button"
          style={styles.recipientButton}
        >
          {destinationDisplayName ? (
            <Text
              variant={TextVariant.BodyMD}
              numberOfLines={1}
              style={styles.accountNameText}
            >
              {destinationWalletName ? `${destinationWalletName} / ` : ''}{' '}
              {destinationDisplayName}
            </Text>
          ) : (
            <Text variant={TextVariant.BodyMD}>
              {shortenString(destinationAccountAddress, {
                truncatedCharLimit: 15,
                truncatedStartChars: 7,
                truncatedEndChars: 5,
                skipCharacterInEnd: false,
              })}
            </Text>
          )}
          <Icon
            name={IconName.Edit}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        </TouchableOpacity>
      </Box>
    </KeyValueRowStubs.Root>
  );
};

export default QuoteDetailsRecipientKeyValueRow;
