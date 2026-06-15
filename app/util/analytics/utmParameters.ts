export const UTM_PARAMETERS = [
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
] as const;

export type UtmParameter = (typeof UTM_PARAMETERS)[number];
