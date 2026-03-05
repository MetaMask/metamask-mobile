import {
  array,
  boolean,
  defaulted,
  number,
  object,
  string,
} from '@metamask/superstruct';
import { Hex } from './common';

export const PredictFeeCollectionSchema = object({
  enabled: defaulted(boolean(), true),
  collector: defaulted(Hex, () =>
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? '0xe6a2026d58eaff3c7ad7ba9386fb143388002382'
      : '0x100c7b833bbd604a77890783439bbb9d65e31de7',
  ),
  metamaskFee: defaulted(number(), 0.02), // 2%
  providerFee: defaulted(number(), 0.02),
  waiveList: defaulted(array(string()), []),
  executors: defaulted(array(string()), []),
  permit2Enabled: defaulted(boolean(), false),
});
