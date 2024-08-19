import { UR } from '@ngraveio/bc-ur';

class URRegistryDecoder {
  getProgress: () => number;
  receivePart: (content: unknown) => void;
  isError: () => boolean;
  resultError: () => string;
  isSuccess: () => boolean;
  resultUR: () => UR;
}

export { URRegistryDecoder };
