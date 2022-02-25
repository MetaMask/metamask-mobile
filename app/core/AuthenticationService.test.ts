import AuthenticationService from './AuthenticationService';
import Engine from '../core/Engine';

describe('AuthenticationService', () => {
	const mockStore = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		dispatch: () => {},
	};

	it('should init correctly', async () => {
		Engine.init({ KeyringController: {} });
		expect(AuthenticationService.init(mockStore)).toBeDefined();
	});
});
