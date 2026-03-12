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
import type { TokenSecurityData } from '../../types';
import { getFeatureTags } from '../../utils/securityUtils';
import type { TokenDetailsRouteParams } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

interface SecurityTrustEntryCardProps {
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  token: TokenDetailsRouteParams;
}

const RESULT_TYPE_CONFIG: Record<
  string,
  { label: string; textColor: TextColor }
> = {
  Verified: {
    label: strings('security_trust.safe'),
    textColor: TextColor.SuccessDefault,
  },
  Benign: {
    label: strings('security_trust.safe'),
    textColor: TextColor.SuccessDefault,
  },
  Warning: {
    label: strings('security_trust.medium_risk'),
    textColor: TextColor.WarningDefault,
  },
  Spam: {
    label: strings('security_trust.medium_risk'),
    textColor: TextColor.WarningDefault,
  },
  Malicious: {
    label: strings('security_trust.high_risk'),
    textColor: TextColor.ErrorDefault,
  },
};

const SecurityTrustEntryCard: React.FC<SecurityTrustEntryCardProps> = ({
  securityData,
  isLoading,
  token,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const config = securityData?.resultType
    ? RESULT_TYPE_CONFIG[securityData.resultType]
    : undefined;

  const tagIcon =
    securityData?.resultType === 'Malicious'
      ? IconName.Danger
      : securityData?.resultType === 'Warning' ||
          securityData?.resultType === 'Spam'
        ? IconName.Warning
        : IconName.SecurityTick;
  const tagIconColor =
    securityData?.resultType === 'Malicious'
      ? IconColor.ErrorDefault
      : securityData?.resultType === 'Warning' ||
          securityData?.resultType === 'Spam'
        ? IconColor.WarningDefault
        : IconColor.SuccessDefault;
  const { tags: featureTags, remainingCount } = securityData
    ? getFeatureTags(securityData.features ?? [], securityData.resultType)
    : { tags: [], remainingCount: 0 };

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
        ) : config ? (
          <Text variant={TextVariant.HeadingMd} color={config.textColor}>
            {config.label}
          </Text>
        ) : null}
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
                <Icon name={tagIcon} size={IconSize.Sm} color={tagIconColor} />
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
            {remainingCount > 0 && (
              <Box
                alignItems={BoxAlignItems.Center}
                twClassName="rounded self-start px-1.5 py-0.5"
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  +{remainingCount} {strings('security_trust.more')}
                </Text>
              </Box>
            )}
          </Box>
        )}
        {isLoading && (
          <Box>
            <View style={tw.style('h-3 rounded bg-muted w-3/4')} />
            <View style={tw.style('h-3 rounded bg-muted w-1/2 mt-2')} />
          </Box>
        )}
      </Box>
    </Pressable>
  );
};

export default SecurityTrustEntryCard;
