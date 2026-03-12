import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  learnMore: {
    marginTop: 12,
  },
});

interface ApprovalsEducationProps {
  onDismiss: () => void;
}

const ApprovalsEducation: React.FC<ApprovalsEducationProps> = ({
  onDismiss,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.muted }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.info.muted }]}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Xs}
              color={IconColor.Info}
            />
          </View>
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
            {strings('token_approvals.education_title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={strings('token_approvals.education_dismiss')}
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        </TouchableOpacity>
      </View>
      <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
        {strings('token_approvals.education_description')}
      </Text>
      <Button
        variant={ButtonVariants.Link}
        label={strings('token_approvals.education_learn_more')}
        style={styles.learnMore}
      />
    </View>
  );
};

export default ApprovalsEducation;
