import { create, StructError } from '@metamask/superstruct';
import { PredictFeeCollectionSchema } from './flags';
import { DEFAULT_FEE_COLLECTION_FLAG } from '../constants/flags';

describe('PredictFeeCollectionSchema', () => {
  describe('defaults', () => {
    it('returns all defaults when input is undefined', () => {
      const result = create(undefined, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(DEFAULT_FEE_COLLECTION_FLAG);
    });

    it('returns all defaults when input is an empty object', () => {
      const result = create({}, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(DEFAULT_FEE_COLLECTION_FLAG);
    });

    it('fills missing fields with defaults', () => {
      const input = { enabled: false };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.enabled).toBe(false);
      expect(result.collector).toBe(DEFAULT_FEE_COLLECTION_FLAG.collector);
      expect(result.metamaskFee).toBe(DEFAULT_FEE_COLLECTION_FLAG.metamaskFee);
      expect(result.providerFee).toBe(DEFAULT_FEE_COLLECTION_FLAG.providerFee);
      expect(result.waiveList).toStrictEqual(
        DEFAULT_FEE_COLLECTION_FLAG.waiveList,
      );
      expect(result.executors).toStrictEqual(
        DEFAULT_FEE_COLLECTION_FLAG.executors,
      );
      expect(result.permit2Enabled).toBe(
        DEFAULT_FEE_COLLECTION_FLAG.permit2Enabled,
      );
    });
  });

  describe('valid inputs', () => {
    it('preserves all provided fields', () => {
      const input = {
        enabled: false,
        collector: '0x1234567890abcdef1234567890abcdef12345678',
        metamaskFee: 0.05,
        providerFee: 0.03,
        waiveList: ['0xaaa', '0xbbb'],
        executors: ['0xccc'],
        permit2Enabled: true,
      };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(input);
    });

    it('preserves enabled=false override', () => {
      const input = { enabled: false };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.enabled).toBe(false);
    });

    it('preserves custom collector address', () => {
      const input = {
        collector: '0x0000000000000000000000000000000000000001',
      };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.collector).toBe(
        '0x0000000000000000000000000000000000000001',
      );
    });

    it('preserves custom fee values', () => {
      const input = { metamaskFee: 0.1, providerFee: 0 };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.metamaskFee).toBe(0.1);
      expect(result.providerFee).toBe(0);
    });

    it('preserves non-empty waiveList', () => {
      const input = { waiveList: ['0xaaa', '0xbbb'] };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.waiveList).toStrictEqual(['0xaaa', '0xbbb']);
    });

    it('preserves non-empty executors list', () => {
      const input = { executors: ['0xexec1', '0xexec2'] };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.executors).toStrictEqual(['0xexec1', '0xexec2']);
    });

    it('preserves permit2Enabled=true override', () => {
      const input = { permit2Enabled: true };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.permit2Enabled).toBe(true);
    });
  });

  describe('type validation', () => {
    it('throws for non-boolean enabled field', () => {
      const input = { enabled: 'yes' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-string collector field', () => {
      const input = { collector: 12345 };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-number metamaskFee field', () => {
      const input = { metamaskFee: '0.02' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-number providerFee field', () => {
      const input = { providerFee: true };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-array waiveList field', () => {
      const input = { waiveList: 'not-an-array' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-array executors field', () => {
      const input = { executors: 42 };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-boolean permit2Enabled field', () => {
      const input = { permit2Enabled: 'true' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for collector without 0x prefix', () => {
      const input = { collector: 'not-a-hex-address' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });
  });
});
