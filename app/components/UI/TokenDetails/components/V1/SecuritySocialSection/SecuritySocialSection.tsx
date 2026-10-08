import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName,
} from '@metamask/design-system-react-native';
import type { TokenSecurityMetadata } from '@metamask/assets-controllers';
import { strings } from '../../../../../../../locales/i18n';
import { useCopyTokenContractAddress } from '../../../hooks/useCopyTokenContractAddress';
import {
  SecurityPill,
  type SecurityVerdict,
} from '../SecurityPill/SecurityPill';
import { SecuritySocialSectionSelectors } from './SecuritySocialSection.testIds';

interface SocialLink {
  testID: string;
  iconName: IconName;
  accessibilityLabel: string;
  url: string;
}

export interface SecuritySocialSectionProps {
  securityVerdict: SecurityVerdict;
  /** Only read when the verdict is `medium_risk`. */
  securityFlagCount?: number;
  onSecurityPress?: () => void;
  /**
   * Official links from the token's security metadata. Every field is
   * independently nullable, and each button is dropped when its link is
   * missing, so a token with no socials renders the pill alone.
   */
  externalLinks?: TokenSecurityMetadata['externalLinks'] | null;
  /** Contract address for the copy chip, which is hidden without one. */
  contractAddress?: string | null;
}

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => null);
};

/**
 * Renders an address as `0x...1933`.
 *
 * Deliberately shorter than the app-wide `formatAddress(_, 'short')`, which
 * keeps five characters each side: this chip shares one wrapping row with the
 * verdict pill and the social buttons, so the address gives up width to keep
 * the row on a single line. The full address still reaches the clipboard and
 * the accessibility label.
 */
const truncateAddress = (address: string) =>
  `${address.slice(0, 2)}...${address.slice(-4)}`;

/**
 * Row below the Token Details V1 header: the security verdict pill, the
 * token's official links, and a chip that copies the contract address.
 *
 * Everything sits left-aligned and wraps as one group rather than being spread
 * across the row, so a token with few links leaves trailing space instead of
 * stretching its buttons apart.
 */
export const SecuritySocialSection: React.FC<SecuritySocialSectionProps> = ({
  securityVerdict,
  securityFlagCount,
  onSecurityPress,
  externalLinks,
  contractAddress,
}) => {
  const handleCopyAddress = useCopyTokenContractAddress(
    contractAddress ?? null,
  );

  const socialLinks = useMemo<SocialLink[]>(() => {
    const links: SocialLink[] = [];
    if (!externalLinks) {
      return links;
    }

    const { homepage, twitterPage, telegramChannelId } = externalLinks;

    if (twitterPage) {
      links.push({
        testID: SecuritySocialSectionSelectors.LINK_X,
        iconName: IconName.X,
        accessibilityLabel: strings('token_details_v1.social.x'),
        // The API returns a bare handle, not a URL.
        url: `https://x.com/${twitterPage}`,
      });
    }
    if (homepage) {
      links.push({
        testID: SecuritySocialSectionSelectors.LINK_WEBSITE,
        iconName: IconName.Global,
        accessibilityLabel: strings('token_details_v1.social.website'),
        url: homepage,
      });
    }
    if (telegramChannelId) {
      links.push({
        testID: SecuritySocialSectionSelectors.LINK_TELEGRAM,
        // Solid brand mark, so it reads heavier than the outlined X and globe
        // beside it. The design uses an outlined paper plane, which the
        // design system does not currently ship.
        iconName: IconName.Telegram,
        accessibilityLabel: strings('token_details_v1.social.telegram'),
        url: `https://t.me/${telegramChannelId}`,
      });
    }

    return links;
  }, [externalLinks]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-wrap gap-2"
      testID={SecuritySocialSectionSelectors.SECTION}
    >
      <SecurityPill
        verdict={securityVerdict}
        flagCount={securityFlagCount}
        onPress={onSecurityPress}
      />

      {/* `ButtonIconSize.Xs` is picked for its 16px icon, then widened to the
          28px circle the row uses; the size scale has no 28px step. The
          background is restated because `Filled` resolves to the translucent
          `bg-muted`, while the design calls for the solid alternative surface
          the chip below also sits on. */}
      {socialLinks.map(({ testID, iconName, accessibilityLabel, url }) => (
        <ButtonIcon
          key={testID}
          iconName={iconName}
          size={ButtonIconSize.Xs}
          variant={ButtonIconVariant.Filled}
          twClassName="h-7 w-7 bg-alternative"
          onPress={() => openUrl(url)}
          accessibilityLabel={accessibilityLabel}
          testID={testID}
        />
      ))}

      {contractAddress ? (
        <ButtonBase
          size={ButtonBaseSize.Sm}
          startIconName={IconName.Copy}
          // An address is data, not a label, so it keeps the regular weight
          // rather than the medium weight ButtonBase gives button text.
          textProps={{ fontWeight: FontWeight.Regular }}
          twClassName={(pressed) =>
            `h-7 px-2 ${pressed ? 'bg-alternative-pressed' : 'bg-alternative'}`
          }
          onPress={handleCopyAddress}
          accessibilityLabel={strings('token_details_v1.social.copy_address', {
            address: contractAddress,
          })}
          testID={SecuritySocialSectionSelectors.COPY_ADDRESS}
        >
          {truncateAddress(contractAddress)}
        </ButtonBase>
      ) : null}
    </Box>
  );
};

export default SecuritySocialSection;
