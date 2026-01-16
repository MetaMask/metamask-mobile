import React from 'react';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { KeyValueRowStubs } from '../../../../../component-library/components-temp/KeyValueRow';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { selectIsSwap } from '../../../../../core/redux/slices/bridge';
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

  if (isSwap) {
    return null;
  }

  return (
    <KeyValueRowStubs.Root>
      <Box style={styles.recipientFieldSection}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
              color={TextColor.Alternative}
            >
              {destinationWalletName ? `${destinationWalletName} / ` : ''}
              {destinationDisplayName}
            </Text>
          ) : destinationAccountAddress ? (
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {shortenString(destinationAccountAddress, {
                truncatedCharLimit: 15,
                truncatedStartChars: 7,
                truncatedEndChars: 5,
                skipCharacterInEnd: false,
              })}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodyMD}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.recipientText}
              color={TextColor.Alternative}
            >
              {strings('bridge.select_recipient')}
            </Text>
          )}
          <Icon
            name={IconName.Edit}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </TouchableOpacity>
      </Box>
    </KeyValueRowStubs.Root>
  );
};

export default QuoteDetailsRecipientKeyValueRow;
