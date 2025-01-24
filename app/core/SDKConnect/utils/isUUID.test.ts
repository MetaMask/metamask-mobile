import { isUUID } from './isUUID';

describe('isUUID', () => {
  it('should return true for valid UUIDs', () => {
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      'c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd',
      '507f191e-1f7f-4d1b-9bc8-d8d49c6b1012',
      // Uppercase should also work due to case-insensitive flag
      'A987FBC9-4BED-3078-CF07-9141BA07C9F3',
    ];

    validUUIDs.forEach((uuid) => {
      expect(isUUID(uuid)).toBe(true);
    });
  });

  it('should return false for invalid UUIDs', () => {
    const invalidUUIDs = [
      '',
      'not-a-uuid',
      '123e4567-e89b-12d3-a456', // incomplete
      '123e4567-e89b-12d3-a456-42661417400z', // invalid character
      '123e4567-e89b-12d3-a456-4266141740000', // too long
      '123e4567.e89b.12d3.a456.426614174000', // wrong separator
      null,
      undefined,
    ];

    invalidUUIDs.forEach((uuid) => {
      // @ts-expect-error Testing invalid inputs
      expect(isUUID(uuid)).toBe(false);
    });
  });
});
