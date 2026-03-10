import React from 'react';
import { Pressable, View, ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { RiskLevel, type TokenSecurityData } from '../../types';
import { getRiskLevel, getFeatureTags } from '../../utils/securityUtils';
import type { TokenDetailsRouteParams } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

interface SecurityTrustEntryCardProps {
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  timeAgo: string;
  token: TokenDetailsRouteParams;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; textColor: TextColor }> =
  {
    [RiskLevel.Low]: {
      label: strings('security_trust.no_risks_detected'),
      textColor: TextColor.SuccessDefault,
    },
    [RiskLevel.Medium]: {
      label: strings('security_trust.medium_risk'),
      textColor: TextColor.WarningDefault,
    },
    [RiskLevel.High]: {
      label: strings('security_trust.high_risk'),
      textColor: TextColor.ErrorDefault,
    },
    [RiskLevel.Unknown]: {
      label: strings('security_trust.data_unavailable'),
      textColor: TextColor.TextAlternative,
    },
  };

const SecurityTrustEntryCard: React.FC<SecurityTrustEntryCardProps> = ({
  securityData,
  isLoading,
  timeAgo,
  token,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const riskLevel = getRiskLevel(securityData?.resultType);
  const config = RISK_CONFIG[riskLevel];
  const featureTags = securityData
    ? getFeatureTags(securityData.features ?? [], securityData.fees)
    : [];

  const handlePress = () => {
    navigation.navigate(
      Routes.SECURITY_TRUST as never,
      {
        ...token,
        securityData,
      } as never,
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => tw.style(pressed && 'opacity-70')}
      testID="security-trust-entry-card"
    >
      <Box gap={3}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="h-6"
          gap={1}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('security_trust.title')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Box>

        {/* Row 2: Risk label or loading indicator */}
        {isLoading ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <ActivityIndicator size="small" />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('security_trust.loading')}
            </Text>
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={config.textColor}
            fontWeight={FontWeight.Medium}
          >
            {config.label}
          </Text>
        )}
        {!isLoading && featureTags.length > 0 && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="flex-wrap"
            gap={2}
          >
            {featureTags.map((tag) => (
              <Box
                key={tag.label}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="bg-muted rounded self-start min-w-[22px] px-1.5 py-0.5"
                gap={1}
              >
                <Icon
                  name={
                    tag.isPositive
                      ? IconName.SecurityTick
                      : IconName.SecurityCross
                  }
                  size={IconSize.Sm}
                  color={
                    tag.isPositive
                      ? IconColor.SuccessDefault
                      : IconColor.ErrorDefault
                  }
                />
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                  numberOfLines={1}
                >
                  {tag.label}
                </Text>
              </Box>
            ))}
          </Box>
        )}
        {isLoading && (
          <Box>
            <View style={tw.style('h-3 rounded bg-muted w-3/4')} />
            <View style={tw.style('h-3 rounded bg-muted w-1/2 mt-2')} />
          </Box>
        )}
        {!isLoading && timeAgo ? (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {timeAgo}
          </Text>
        ) : null}
      </Box>
    </Pressable>
  );
};

export default SecurityTrustEntryCard;
