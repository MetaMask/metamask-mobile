import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { renderShortAddress } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import { selectApprovals } from '../../selectors';
import { useRevokeApproval } from '../../hooks/useRevokeApproval';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

const RevokeConfirmSheet: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const approvals = useSelector(selectApprovals);
  const { revokeApproval } = useRevokeApproval();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { approvalId } = (route.params as { approvalId: string }) ?? {};

  const approval = useMemo(
    () => approvals.find((a) => a.id === approvalId),
    [approvals, approvalId],
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    if (!approval || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await revokeApproval(approval);
      navigation.goBack();
    } catch {
      setIsSubmitting(false);
    }
  }, [approval, isSubmitting, revokeApproval, navigation]);

  if (!approval) {
    return null;
  }

  const spenderLabel =
    approval.spender.label || renderShortAddress(approval.spender.address);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <Text
        variant={TextVariant.HeadingSM}
        color={TextColor.Default}
        style={styles.title}
      >
        {strings('token_approvals.revoke_confirm_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {strings('token_approvals.revoke_confirm_description', {
          spender: spenderLabel,
          token: approval.asset.symbol,
        })}
      </Text>

      <View style={styles.buttonRow}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          label={strings('token_approvals.filter_all')}
          onPress={handleCancel}
          style={styles.button}
          isDisabled={isSubmitting}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={
            isSubmitting
              ? strings('token_approvals.revoking')
              : strings('token_approvals.revoke')
          }
          isDanger
          onPress={handleConfirm}
          style={styles.button}
          isDisabled={isSubmitting}
        />
      </View>
    </View>
  );
};

export default RevokeConfirmSheet;
