import PortDuplexStream from './MobilePortStream';

interface MockPort {
  addListener: jest.Mock;
  postMessage: jest.Mock;
}

describe('PortDuplexStream', () => {
  let portDuplexStream: PortDuplexStream;
  let mockPort: MockPort;

  beforeEach(() => {
    mockPort = {
      addListener: jest.fn(),
      postMessage: jest.fn(),
    };
    portDuplexStream = new PortDuplexStream(mockPort as any, 'test-url');
  });

  it('should create a PortDuplexStream instance', () => {
    expect(portDuplexStream).toBeInstanceOf(PortDuplexStream);
  });

  it('should add message and disconnect listeners to the port', () => {
    expect(mockPort.addListener).toHaveBeenCalledTimes(2);
    expect(mockPort.addListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockPort.addListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('should write messages to the port', (done) => {
    const testMessage = { test: 'message' };
    portDuplexStream._write(testMessage, 'utf8', () => {
      expect(mockPort.postMessage).toHaveBeenCalledWith(testMessage, 'test-url');
      done();
    });
  });

  // Add more tests as needed during the migration process
});
