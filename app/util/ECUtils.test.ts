import ec from 'elliptic/ec';

interface AndroidKeyData {
	privateKey: string;
	publicPointX: string;
	publicPointY: string;
}

describe('isSuccessfulGenerated Public Address', () => {
	const androidGeneratedKeySet1: AndroidKeyData = {
		privateKey: 'string',
		publicPointX: 'string',
		publicPointY: 'string',
	};

	const androidGeneratedKeySet2: AndroidKeyData = {
		privateKey: 'string',
		publicPointX: 'string',
		publicPointY: 'string',
	};

	const androidGeneratedKeySet3: AndroidKeyData = {
		privateKey: 'string',
		publicPointX: 'string',
		publicPointY: 'string',
	};

	it('should match RegEx if name "Account 1" has default pattern', () => {
		console.log(androidGeneratedKeySet1);
        console.log(androidGeneratedKeySet2);
        console.log(androidGeneratedKeySet3);
        console.log(ec);
	});
});
