import type { PackPartnerApi } from '../../services/clients/PackPartnerApiClient';

/** Controller-owned client for Pack Partner transactions. */
export class PackPartnerProvider {
  protected readonly api: PackPartnerApi;

  constructor(api: PackPartnerApi) {
    this.api = api;
  }
}
