export {
  getOrCreateLocalUserSecret,
  loadLocalUserSecret,
  hasLocalUserSecret,
} from './localUserSecret';
export {
  deriveClientMaterial,
  encodeClientMaterial,
} from './deriveClientMaterial';
export type {
  UkycClientMaterial,
  EncodedUkycClientMaterial,
} from './deriveClientMaterial';
export {
  signStorageAccessToken,
  encodeStorageAccessTokenForHeader,
  canonicalizeJson,
} from './storageAccessToken';
export type {
  UkycStorageOperation,
  UkycTokenPresenter,
  UkycStorageAccessToken,
  UkycStorageAccessTokenPayload,
  SignStorageAccessTokenParams,
} from './storageAccessToken';
export { buildWrappedRelayPayload } from './wrappedRelayPayload';
export type { UkycWrappedRelayPayload } from './wrappedRelayPayload';
export { toBase64Url } from './encoding';
export {
  UKYC_LOCAL_USER_SECRET_PATH,
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
  UKYC_DERIVED_KEY_SIZES,
  UKYC_KDF_INFO,
  UKYC_STORAGE_ACCESS_TOKEN_VERSION,
  UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE,
} from './constants';
