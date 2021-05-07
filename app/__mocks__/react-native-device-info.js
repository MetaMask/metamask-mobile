export default {
	getModel: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('getModel');
	}),
	getApplicationName: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('getApplicationName');
	}),
	getVersion: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('getVersion');
	}),
	getBuildNumber: jest.fn().mockImplementation(() => {
		// eslint-disable-next-line no-console
		console.log('getBuildNumber');
	})
};
