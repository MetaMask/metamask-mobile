import React, { useCallback } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { QuestionOption } from './scam-questionnaire.constants';
import styleSheet from './scam-questionnaire.styles';

export interface QuestionScreenProps {
  iconName: IconName;
  title: string;
  subtitle: string;
  options: QuestionOption[];
  selectedKey?: string;
  onSelect: (option: QuestionOption) => void;
  onContinue: () => void;
}

export const QuestionScreen: React.FC<QuestionScreenProps> = ({
  iconName,
  title,
  subtitle,
  options,
  selectedKey,
  onSelect,
  onContinue,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const renderOption = useCallback(
    (option: QuestionOption) => {
      const isSelected = option.key === selectedKey;
      return (
        <TouchableOpacity
          key={option.key}
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={() => onSelect(option)}
          activeOpacity={0.85}
          testID={`scam-questionnaire-option-${option.key}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
        >
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionTextContainer}>
            <Text variant={TextVariant.BodyMDMedium} style={styles.optionTitle}>
              {strings(option.titleKey)}
            </Text>
            {option.subtitleKey && (
              <Text variant={TextVariant.BodySM} style={styles.optionSubtitle}>
                {strings(option.subtitleKey)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [onSelect, selectedKey, styles],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBadge}>
          <Icon
            name={iconName}
            size={IconSize.Xl}
            color={colors.text.default}
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {title}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
          {subtitle}
        </Text>
        {options.map(renderOption)}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          isDisabled={!selectedKey}
          onPress={onContinue}
          label={
            selectedKey
              ? strings('scam_questionnaire.continue')
              : strings('scam_questionnaire.select_an_answer')
          }
          testID="scam-questionnaire-continue"
        />
      </View>
    </View>
  );
};
