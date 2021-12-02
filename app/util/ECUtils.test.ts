import KeyPair from 'elliptic/';

describe('isSuccessfulGenerated Public Address', () => {
	const privateKeyTest = 'c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed';
	const publicAddress = '0xD8Cc0b581e523A9f61eF06A863018Fe04Eb166D4';

	it('should match RegEx if name "Account 1" has default pattern', () => {
		console.log(KeyPair);
		expect(KeyPair).toBeNull();
	});
});
