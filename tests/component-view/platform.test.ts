import { getTargetPlatforms } from './platform';

describe('component-view platform selection', () => {
  const originalTestOs = Reflect.get(process.env, 'TEST_OS');

  afterEach(() => {
    if (originalTestOs === undefined) {
      Reflect.deleteProperty(process.env, 'TEST_OS');
      return;
    }
    Reflect.set(process.env, 'TEST_OS', originalTestOs);
  });

  it('reads TEST_OS at runtime instead of retaining a cached transform value', () => {
    Reflect.set(process.env, 'TEST_OS', 'ios');
    expect(getTargetPlatforms()).toEqual(['ios']);

    Reflect.set(process.env, 'TEST_OS', 'android');
    expect(getTargetPlatforms()).toEqual(['android']);
  });
});
