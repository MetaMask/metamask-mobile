import Engine from './Engine';

describe('Engine', () => {
  let engine: ReturnType<typeof Engine.init>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize without errors', () => {
    expect(() => {
      engine = Engine.init({});
    }).not.toThrow();
    expect(engine).toBeDefined();
  });

  // Add more test cases here as needed
});
