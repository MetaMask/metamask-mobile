import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components-temp/Skeleton/Skeleton';
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
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { TokenSecurityData } from '../../types';
import { getFeatureTags, getResultTypeConfig } from '../../utils/securityUtils';
import type { TokenDetailsRouteParams } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

interface SecurityTrustEntryCardProps {
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  token: TokenDetailsRouteParams;
}

const SecurityTrustEntryCard: React.FC<SecurityTrustEntryCardProps> = ({
  securityData,
  isLoading,
  token,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const config = getResultTypeConfig(securityData?.resultType);
  const tagIcon = config.icon;
  const tagIconColor = config.iconColor;
  const { tags: featureTags, remainingCount } = securityData
    ? getFeatureTags(securityData.features ?? [], securityData.resultType)
    : { tags: [], remainingCount: 0 };

  const hasDetails = (securityData?.features?.length ?? 0) > 0;

  const handlePress = () => {
    if (!hasDetails) return;
    navigation.navigate(Routes.SECURITY_TRUST, {
      ...token,
      securityData,
    });
  };

  const content = isLoading ? (
    <Box gap={3}>
      <Skeleton height={22} width="100%" />
      <Skeleton height={24} width="50%" />
      <Box flexDirection={BoxFlexDirection.Row} gap={2}>
        <Skeleton height={20} width="30%" />
        <Skeleton height={20} width="35%" />
      </Box>
    </Box>
  ) : (
    <Box gap={3}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
          {strings('security_trust.title')}
        </Text>
        {hasDetails && (
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        )}
      </Box>
      <Text
        variant={TextVariant.HeadingMd}
        color={config.textColor}
        fontWeight={'600' as FontWeight}
      >
        {config.label}
      </Text>
      {hasDetails ? (
        featureTags.length > 0 && (
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
                {tagIcon && tagIconColor && (
                  <Icon
                    name={tagIcon}
                    size={IconSize.Sm}
                    color={tagIconColor}
                  />
                )}
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
        )
      ) : config.subtitle ? (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {config.subtitle}
        </Text>
      ) : null}
    </Box>
  );

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => tw.style(hasDetails && pressed && 'opacity-70')}
      testID="security-trust-entry-card"
    >
      {content}
    </Pressable>
  );
};

export default SecurityTrustEntryCard;
