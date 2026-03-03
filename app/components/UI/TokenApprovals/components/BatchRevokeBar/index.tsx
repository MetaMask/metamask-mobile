import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  countText: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
});

interface BatchRevokeBarProps {
  selectedCount: number;
  onRevoke: () => void;
  onClear: () => void;
  isProcessing: boolean;
}

const BatchRevokeBar: React.FC<BatchRevokeBarProps> = ({
  selectedCount,
  onRevoke,
  onClear,
  isProcessing,
}) => {
  const { colors } = useTheme();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.default,
          shadowColor: colors.shadow?.default ?? colors.border.default,
        },
      ]}
    >
      <Text
        variant={TextVariant.BodyLGMedium}
        color={TextColor.Default}
        style={styles.countText}
      >
        {strings('token_approvals.batch_revoke_bar', {
          count: selectedCount.toString(),
        })}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          label={strings('token_approvals.clear_selection')}
          onPress={onClear}
          isDisabled={isProcessing}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Sm}
          label={strings('token_approvals.batch_revoke_cta')}
          onPress={onRevoke}
          isDisabled={isProcessing}
        />
      </View>
    </View>
  );
};

export default BatchRevokeBar;
