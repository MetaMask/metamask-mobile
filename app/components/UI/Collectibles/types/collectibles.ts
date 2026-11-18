/**
 * Application-facing names for the current PackPartner model.
 * These are compile-time aliases, not a second schema or runtime mapper.
 * PackPartner remains authoritative until a second provider demonstrates
 * a concrete difference; its adapter can initially target this same shape.
 */
export type {
  PackPartnerPack as CollectiblesPack,
  PackPartnerCard as CollectiblesCard,
  PackPartnerRarity as CollectiblesRarity,
  PackPartnerNftStandard as CollectiblesNftStandard,
  PackPartnerBuyback as CollectiblesBuyback,
  PackPartnerSale as CollectiblesSale,
  PackPartnerErrorCode as CollectiblesErrorCode,
  PackPartnerErrorState as CollectiblesErrorState,
  PackPartnerPackRef as CollectiblesPackRef,
  PackPartnerSaleResult as CollectiblesSaleResult,
  PackPartnerAccount as CollectiblesWalletAccount,
  PackPartnerPurchaseOptions as CollectiblesPurchaseOptions,
  PackPartnerPackOperationStatus as CollectiblesPackOperationStatus,
  PackPartnerPackOperation as CollectiblesPackOperation,
  PackPartnerBuybackOperation as CollectiblesBuybackOperation,
} from '../providers/pack-partner/types/packPartner';
export type {
  PackPartnerInventoryCard as CollectiblesInventoryCard,
  PackPartnerInventoryPage as CollectiblesInventoryPage,
} from '../providers/pack-partner/types/inventory';
export type { PackPartnerOpening as CollectiblesOpening } from '../providers/pack-partner/types/openings';
