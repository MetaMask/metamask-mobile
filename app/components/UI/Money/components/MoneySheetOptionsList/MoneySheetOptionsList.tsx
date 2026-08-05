import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import styleSheet from './MoneySheetOptionsList.styles';

export interface MoneySheetOptionPrivacyMask {
  maskedText: string;
  /** The suffix is visible regardless of privacy mode and rendered after the masked text. */
  suffix?: string;
}

export interface MoneySheetOption {
  /**
   * A plain string renders as-is. Passing `{ maskedText, suffix }` instead
   * renders `maskedText` followed by `suffix`; `maskedText` is hidden
   * in privacy mode while `suffix` (if any) always stays
   * visible. Omitting `suffix` masks the entire provided text.
   */
  label: string | MoneySheetOptionPrivacyMask;
  icon: IconName;
  onPress?: () => void;
  testID: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface MoneySheetOptionsListProps {
  options: MoneySheetOption[];
}

const isPrivacyMaskLabel = (
  label: MoneySheetOption['label'],
): label is MoneySheetOptionPrivacyMask => typeof label !== 'string';

const MoneySheetOptionsList = ({ options }: MoneySheetOptionsListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const privacyMode = useSelector(selectPrivacyMode);

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
                {isPrivacyMaskLabel(item.label)
                  ? [item.label.maskedText, item.label.suffix]
                      .filter(Boolean)
                      .join(' ')
                  : item.label}
              </Text>
              <Tag
                label={strings('money.add_money_sheet.coming_soon')}
                style={styles.comingSoonTag}
              />
            </View>
          ) : (
            <View style={styles.rowLabelContainer}>
              {isPrivacyMaskLabel(item.label) ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <SensitiveText
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={
                      item.disabled ? TextColor.TextAlternative : undefined
                    }
                    isHidden={privacyMode}
                    length={
                      item.label.suffix
                        ? SensitiveTextLength.Short
                        : SensitiveTextLength.Medium
                    }
                  >
                    {item.label.maskedText}
                  </SensitiveText>
                  {item.label.suffix ? (
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={
                        item.disabled ? TextColor.TextAlternative : undefined
                      }
                    >
                      {item.label.suffix}
                    </Text>
                  ) : null}
                </Box>
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={item.disabled ? TextColor.TextAlternative : undefined}
                >
                  {item.label}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  );
};

export default MoneySheetOptionsList;
