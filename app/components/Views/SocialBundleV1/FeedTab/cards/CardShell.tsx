import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

interface CardShellProps {
  tokenSymbol: string;
  tokenLogo: ImageSourcePropType | null;
  /** Right-of-symbol pill (e.g. "Short", "Buy", "15X SHORT"). */
  sidePill: {
    label: string;
    tone: 'positive' | 'negative' | 'neutral';
  };
  /** Second row under the symbol — subtitle metadata (e.g. "$212k · $38M"). */
  subtitle?: string;
  /** Big PnL amount at top-right. */
  pnlAbs?: string;
  /** Small percent under `pnlAbs`. */
  pnlPct?: string;
  pnlTone?: 'positive' | 'negative';
  children?: React.ReactNode;
}

/**
 * Rounded card used by every position variant. Consumes the shared header
 * (symbol + side pill + PnL block) and lets each variant own the body via
 * `children`.
 */
const CardShell: React.FC<CardShellProps> = ({
  tokenSymbol,
  tokenLogo,
  sidePill,
  subtitle,
  pnlAbs,
  pnlPct,
  pnlTone = 'positive',
  children,
}) => {
  const tw = useTailwind();

  const pillBg =
    sidePill.tone === 'positive'
      ? 'bg-success-muted'
      : sidePill.tone === 'negative'
        ? 'bg-error-muted'
        : 'bg-background-muted';
  const pillText =
    sidePill.tone === 'positive'
      ? TextColor.SuccessDefault
      : sidePill.tone === 'negative'
        ? TextColor.ErrorDefault
        : TextColor.TextAlternative;

  const pnlColor =
    pnlTone === 'positive' ? TextColor.SuccessDefault : TextColor.ErrorDefault;

  return (
    <Box
      style={tw.style('bg-background-alternative rounded-2xl p-4 gap-3 mt-3')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={tw.style('gap-3')}
      >
        {tokenLogo != null ? (
          <AvatarBase size={AvatarBaseSize.Md} shape={AvatarBaseShape.Circle}>
            <Image source={tokenLogo} style={tw.style('w-full h-full')} />
          </AvatarBase>
        ) : (
          <AvatarToken name={tokenSymbol} size={AvatarTokenSize.Md} />
        )}

        <Box style={tw.style('flex-1 gap-0.5')}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            style={tw.style('gap-2')}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {tokenSymbol}
            </Text>
            <Box style={tw.style(`${pillBg} rounded-md px-2 py-0.5`)}>
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={pillText}
              >
                {sidePill.label}
              </Text>
            </Box>
          </Box>
          {subtitle ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {subtitle}
            </Text>
          ) : null}
        </Box>

        {pnlAbs ? (
          <Box alignItems={BoxAlignItems.End} style={tw.style('gap-0.5')}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={pnlColor}
            >
              {pnlAbs}
            </Text>
            {pnlPct ? (
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={pnlColor}
              >
                {pnlPct}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {children}
    </Box>
  );
};

export default CardShell;
