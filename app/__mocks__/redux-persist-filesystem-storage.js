/* eslint-disable import/no-commonjs */
/**
 * Mock for redux-persist-filesystem-storage
 * Used in tests to avoid transforming the native filesystem storage package.
 */
const storageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  clear: jest.fn(),
};

module.exports = storageMock;
