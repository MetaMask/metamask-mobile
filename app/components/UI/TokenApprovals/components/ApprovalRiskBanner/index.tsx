import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd } from '../../utils/formatUsd';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  textColumn: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.8,
  },
});

interface ApprovalRiskBannerProps {
  maliciousCount: number;
  exposureUsd: number;
  onRevokeAll: () => void;
}

const ApprovalRiskBanner: React.FC<ApprovalRiskBannerProps> = ({
  maliciousCount,
  exposureUsd,
  onRevokeAll,
}) => {
  const { colors } = useTheme();

  if (maliciousCount === 0) {
    return null;
  }

  const titleKey =
    maliciousCount === 1
      ? 'token_approvals.risk_banner_title'
      : 'token_approvals.risk_banner_title_plural';

  const formattedExposure = formatUsd(exposureUsd);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.error.muted,
          shadowColor: colors.error.default,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <Icon
          name={IconName.Danger}
          size={IconSize.Lg}
          color={IconColor.Error}
        />
        <View style={styles.textColumn}>
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Error}>
            {strings(titleKey, { count: maliciousCount.toString() })}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Error}
            style={styles.subtitle}
          >
            {strings('token_approvals.risk_banner_subtitle', {
              amount: formattedExposure,
            })}
          </Text>
        </View>
      </View>
      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Md}
        label={strings('token_approvals.risk_banner_cta')}
        isDanger
        onPress={onRevokeAll}
        width={ButtonWidthTypes.Full}
      />
    </View>
  );
};

export default ApprovalRiskBanner;
