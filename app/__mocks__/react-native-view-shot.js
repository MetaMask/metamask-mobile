export default {
  captureScreen: jest.fn().mockImplementation(() => {
    // eslint-disable-next-line no-console
    console.log('capture screen');
  }),
};
