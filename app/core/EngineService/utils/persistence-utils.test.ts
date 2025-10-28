import { hasPersistedState } from './persistence-utils';

describe('hasPersistedState', () => {
  it('returns false when metadata is undefined', () => {
    // Arrange
    const metadata = undefined;

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when metadata is empty', () => {
    // Arrange
    const metadata = {};

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(false);
  });

  it('returns true when metadata has persistent properties', () => {
    // Arrange
    const metadata = {
      field1: { persist: true, anonymous: false },
      field2: { persist: false, anonymous: true },
    };

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(true);
  });

  it('returns true when metadata has persist function', () => {
    // Arrange
    const metadata = {
      field1: { persist: jest.fn(), anonymous: false },
    };

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when all properties have persist false', () => {
    // Arrange
    const metadata = {
      field1: { persist: false, anonymous: false },
      field2: { persist: false, anonymous: true },
    };

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when property metadata is null', () => {
    // Arrange
    const metadata = {
      field1: null,
      field2: { persist: false, anonymous: false },
    } as unknown as Parameters<typeof hasPersistedState>[0];

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(false);
  });

  it('returns true when at least one property is persistent among multiple', () => {
    // Arrange
    const metadata = {
      field1: { persist: false, anonymous: false },
      field2: { persist: false, anonymous: false },
      field3: { persist: true, anonymous: false },
      field4: { persist: false, anonymous: false },
    };

    // Act
    const result = hasPersistedState(metadata);

    // Assert
    expect(result).toBe(true);
  });
});
