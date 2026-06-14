import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './MoneySheetOptionsList.styles';

export interface MoneySheetOption {
  label: string;
  icon: IconName;
  onPress?: () => void;
  testID: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface MoneySheetOptionsListProps {
  options: MoneySheetOption[];
}

const MoneySheetOptionsList = ({ options }: MoneySheetOptionsListProps) => {
  const { styles } = useStyles(styleSheet, {});

  const orderedOptions: MoneySheetOption[] = [
    ...options.filter((option) => !option.disabled),
    ...options.filter((option) => option.disabled),
  ];

  return (
    <>
      {orderedOptions.map((item) => (
        <TouchableOpacity
          key={item.testID}
          disabled={item.disabled}
          onPress={item.disabled ? undefined : item.onPress}
          style={styles.row}
          testID={item.testID}
        >
          <Icon
            name={item.icon}
            size={IconSize.Lg}
            color={item.disabled ? IconColor.IconMuted : IconColor.IconDefault}
          />
          {item.comingSoon ? (
            <View style={styles.disabledRowContent}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {item.label}
              </Text>
              <Tag
                label={strings('money.add_money_sheet.coming_soon')}
                style={styles.comingSoonTag}
              />
            </View>
          ) : (
            <View style={styles.rowLabelContainer}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={item.disabled ? TextColor.TextAlternative : undefined}
              >
                {item.label}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  );
};

export default MoneySheetOptionsList;
