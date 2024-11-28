import { UR } from '@ngraveio/bc-ur';

class URRegistryDecoder {
  private progress: number;
  private error: boolean;
  private errorMessage: string;
  private success: boolean;
  private ur: UR | null;

  constructor() {
    this.progress = 0;
    this.error = false;
    this.errorMessage = '';
    this.success = false;
    this.ur = null;
  }

  getProgress = (): number => this.progress;

  receivePart = (content: unknown): void => {
    // eslint-disable-next-line no-empty
    if (content) {
    }
    // Implementation for receiving a part of the UR
  };

  isError = (): boolean => this.error;

  resultError = (): string => this.errorMessage;

  isSuccess = (): boolean => this.success;

  resultUR = (): UR => {
    if (this.ur === null) {
      throw new Error('UR is not available');
    }
    return this.ur;
  };
}

export { URRegistryDecoder };
