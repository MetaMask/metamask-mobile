export const SOCIAL_V1_AB_KEY = 'socialAiTSA1122AbtestSocialBundleV1';

export enum SocialV1Variant {
  Control = 'control',
  Treatment = 'treatment',
}

interface SocialV1VariantConfig {
  useSocialV1: boolean;
}

export const SOCIAL_V1_VARIANTS: Record<
  SocialV1Variant,
  SocialV1VariantConfig
> = {
  [SocialV1Variant.Control]: { useSocialV1: false },
  [SocialV1Variant.Treatment]: { useSocialV1: true },
};

export const SOCIAL_V1_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<SocialV1Variant, string>>;
} = {
  experimentName: 'Social V1',
  variationNames: {
    [SocialV1Variant.Control]: 'Legacy Follow Trading home',
    [SocialV1Variant.Treatment]: 'Social V1',
  },
};
