export default {
	show: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('show splash screen');
	}),
	hide: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('hide splash screen');
	})
};
