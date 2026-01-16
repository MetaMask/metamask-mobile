import React, { useCallback } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import { styleSheet } from './BankDetailRow.styles';
import Clipboard from '@react-native-clipboard/clipboard';

interface BankDetailRowProps {
  label: string;
  value: string;
}

const BankDetailRow: React.FC<BankDetailRowProps> = ({ label, value }) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const handleCopyToClipboard = useCallback(
    (_text: string) => () => {
      Clipboard.setString(_text);
    },
    [],
  );

  return (
    <View style={styles.detailRow}>
      <Text variant={TextVariant.BodyMD}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.valueText}
        >
          {value}
        </Text>
        <TouchableOpacity
          onPress={handleCopyToClipboard(value)}
          testID="copy-button"
        >
          <Icon
            name={IconName.Copy}
            size={IconSize.Sm}
            color={theme.colors.icon.alternative}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BankDetailRow;
