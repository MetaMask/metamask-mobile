import greeter from './index';

describe('Test', () => {
  it('greets', () => {
    const name = 'Huey';
    const result = greeter(name);
    expect(result).toEqual('Hello, Huey!');
  });
});
