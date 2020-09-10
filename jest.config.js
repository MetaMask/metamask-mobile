module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'json', 'js', 'jsx', 'node'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: [
    '\\.test\\.ts$',
  ],
  testTimeout: 5000,
};
