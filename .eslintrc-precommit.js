module.exports = {
  extends: ['./.eslintrc.js'],
  // This eslint configuration is only used for precommits. It will not affect the CI checks in Github.
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'enzyme',
            message:
              'We are replacing enzyme with React Testing Library for this project. Import from @testing-library/react-native to write unit tests instead. Reference - https://testing-library.com/docs/react-testing-library/migrate-from-enzyme/',
          },
        ],
      },
    ],
  },
};
