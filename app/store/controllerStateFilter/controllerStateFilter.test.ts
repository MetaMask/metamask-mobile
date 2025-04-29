import { filterPersistableControllers } from './controllerStateFilter';

describe('filterPersistableControllers', () => {
  it('filter out non-persistent properties based on metadata', () => {
    const controllers = {
      controller1: {
        metadata: {
          a: { persist: true },
          b: { persist: false },
          c: { persist: true },
        },
        state: {
          a: 'value1',
          b: 'value2',
          c: 'value3',
        },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: {
        a: 'value1',
        c: 'value3',
      },
    });
  });

  it('handle nested state objects', () => {
    const controllers = {
      controller1: {
        metadata: {
          a: { persist: true },
          b: { persist: false },
          c: { persist: true },
        },
        state: {
          a: { nested: 'value1' },
          b: { nested: 'value2' },
          c: { nested: 'value3' },
        },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: {
        a: { nested: 'value1' },
        c: { nested: 'value3' },
      },
    });
  });

  it('handle controllers without metadata', () => {
    const controllers = {
      controller1: {
        state: { a: 'value1' },
      },
      controller2: {
        metadata: { a: { persist: true } },
        state: { a: 'value2' },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: {
        state: { a: 'value1' },
      },
      controller2: {
        a: 'value2',
      },
    });
  });

  it('handle empty controllers object', () => {
    const controllers = {};

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({});
  });

  it('handle controllers with all non-persistent properties', () => {
    const controllers = {
      controller1: {
        metadata: {
          a: { persist: false },
          b: { persist: false },
        },
        state: {
          a: 'value1',
          b: 'value2',
        },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: {},
    });
  });

  it('handle controllers with all persistent properties', () => {
    const controllers = {
      controller1: {
        metadata: {
          a: { persist: true },
          b: { persist: true },
        },
        state: {
          a: 'value1',
          b: 'value2',
        },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: {
        a: 'value1',
        b: 'value2',
      },
    });
  });

  it('handle multiple controllers with different persistence settings', () => {
    const controllers = {
      controller1: {
        metadata: { a: { persist: true } },
        state: { a: 'value1' },
      },
      controller2: {
        metadata: { b: { persist: false } },
        state: { b: 'value2' },
      },
      controller3: {
        state: { c: 'value3' },
      },
    };

    const result = filterPersistableControllers(controllers);

    expect(result).toEqual({
      controller1: { a: 'value1' },
      controller2: {},
      controller3: {
        state: { c: 'value3' },
      },
    });
  });
});
