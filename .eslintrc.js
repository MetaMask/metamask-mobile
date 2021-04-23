module.exports = {
	root: true,
	parser: '@babel/eslint-parser',
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2017,
		ecmaFeatures: {
			experimentalObjectRestSpread: true,
			impliedStrict: true,
			modules: true,
			blockBindings: true,
			arrowFunctions: true,
			objectLiteralShorthandMethods: true,
			objectLiteralShorthandProperties: true,
			templateStrings: true,
			classes: true,
			jsx: true,
		},
	},

	globals: {
		process: true,
		beforeAll: true,
		afterAll: true,
		describe: true,
		expect: true,
		it: true,
		jasmine: true,
		jest: true,
		spyOn: true,
		element: true,
		by: true,
		beforeEach: true,
		device: true,
		waitFor: true,
		__DEV__: true,
	},

	extends: ['@metamask/eslint-config', '@metamask/eslint-config-nodejs', 'prettier'],

	plugins: ['@babel', 'import', 'prettier'],

	rules: {
		'default-param-last': 'off',
		'prefer-object-spread': 'error',
		'require-atomic-updates': 'off',

		'import/no-unassigned-import': 'off',

		'no-invalid-this': 'off',
		'@babel/no-invalid-this': 'error',

		// Prettier handles this
		'@babel/semi': 'off',

		'node/no-process-env': 'off',

		// TODO: re-enable these rules
		'node/no-sync': 'off',
		'node/no-unpublished-import': 'off',
		'node/no-unpublished-require': 'off',
	},
	overrides: [
		{
			files: ['app/**/*.js'],
			plugins: ['react-native'],
			extends: ['@react-native-community'],
			rules: {
				'no-console': ['warn', { allow: ['warn', 'error'] }],
			},
		},
		{
			files: ['app/**/*.js'],
			plugins: ['react'],
			extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
			rules: {
				'react/no-unused-prop-types': 'error',
				'react/no-unused-state': 'error',
				'react/jsx-boolean-value': 'error',
				'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
				'react/no-deprecated': 'error',
				'react/default-props-match-prop-types': 'error',
				'react/jsx-no-duplicate-props': 'error',
			},
		},
		{
			files: ['e2e/**/*.spec.js'],
			extends: ['@metamask/eslint-config-mocha'],
			rules: {
				'mocha/no-hooks-for-single-case': 'off',
				'mocha/no-setup-in-describe': 'off',
			},
		},
		{
			files: ['**/*.test.js'],
			excludedFiles: ['app/**/*.test.js', 'app/__mocks__/*.js'],
			extends: ['@metamask/eslint-config-mocha'],
			rules: {
				'mocha/no-setup-in-describe': 'off',
			},
		},
		{
			files: ['**/__snapshots__/*.snap'],
			plugins: ['jest'],
			rules: {
				'jest/no-large-snapshots': ['error', { maxSize: 50, inlineMaxSize: 50 }],
			},
		},
		{
			files: ['app/**/*.test.js', 'app/__mocks__/*.js'],
			extends: ['@metamask/eslint-config-jest'],
			rules: {
				'jest/no-restricted-matchers': 'off',
				'import/unambiguous': 'off',
			},
		},
		{
			files: [
				'.eslintrc.js',
				'babel.config.js',
				'nyc.config.js',
				'stylelint.config.js',
				'app/scripts/runLockdown.js',
				'development/**/*.js',
				'test/e2e/**/*.js',
				'test/lib/wait-until-called.js',
				'test/env.js',
				'test/setup.js',
				'jest.config.js',
			],
			parserOptions: {
				sourceType: 'script',
			},
		},
	],

	settings: {
		react: {
			version: 'detect',
		},
		// ESLint doesn't find React Native components
		// Remove this setting when this issue is fixed.
		// https://github.com/facebook/react-native/issues/28549
		'import/ignore': ['react-native'],
	},
};
