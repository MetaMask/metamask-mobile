import greeter from '.';

describe('Test', () => {
  it('greets', () => {
    const name = 'Huey';
    const result = greeter(name);
    expect(result).toStrictEqual('Hello, Huey!');
  });
});
