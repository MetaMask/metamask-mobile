import {
  array,
  boolean,
  defaulted,
  number,
  object,
  string,
} from '@metamask/superstruct';
import { Hex } from './common';

const DEFAULT_FEE_COLLECTOR =
  process.env.METAMASK_ENVIRONMENT === 'dev'
    ? '0xe6a2026d58eaff3c7ad7ba9386fb143388002382'
    : '0x100c7b833bbd604a77890783439bbb9d65e31de7';

const DEFAULT_METAMASK_FEE = 0.02; // 2%
const DEFAULT_PROVIDER_FEE = 0.02; // 2%

export const PredictFeeCollectionSchema = defaulted(
  object({
    enabled: defaulted(boolean(), true),
    collector: defaulted(Hex, () => DEFAULT_FEE_COLLECTOR),
    metamaskFee: defaulted(number(), DEFAULT_METAMASK_FEE),
    providerFee: defaulted(number(), DEFAULT_PROVIDER_FEE),
    waiveList: defaulted(array(string()), []),
    executors: defaulted(array(string()), []),
    permit2Enabled: defaulted(boolean(), false),
  }),
  {
    enabled: true,
    collector: DEFAULT_FEE_COLLECTOR,
    metamaskFee: DEFAULT_METAMASK_FEE,
    providerFee: DEFAULT_PROVIDER_FEE,
    waiveList: [],
    executors: [],
    permit2Enabled: false,
  },
);
