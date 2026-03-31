const channel = {
  bind: jest.fn().mockReturnThis(),
  unbind_all: jest.fn().mockReturnThis(),
};

function Pusher() {
  return {
    subscribe: jest.fn().mockReturnValue(channel),
    unsubscribe: jest.fn(),
    disconnect: jest.fn(),
  };
}

export default Pusher;
