import { useParams } from '../../../../util/navigation/navUtils';

export const DEFAULT_CONFIRMATION_VARIANT = 'default' as const;

interface ConfirmationVariantParams {
  variant?: string;
}

/**
 * Reads the generic confirmations "variant" route param.
 *
 * This is used when a single transaction type has
 * more than one possible confirmation screen.
 */
export function useConfirmationVariant(): string {
  const { variant } = useParams<ConfirmationVariantParams>();

  return variant ?? DEFAULT_CONFIRMATION_VARIANT;
}
