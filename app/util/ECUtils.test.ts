import elliptic from 'elliptic';

interface TestKeyData {
	privateKey: string;
	publicPointX: string;
	publicPointY: string;
}

describe('Genearting Public Key From Private Key Test', () => {
	const ec = elliptic.curves.secp256k1;

	const androidGeneratedKeySet1: TestKeyData = {
		privateKey: 'c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed',
		publicPointX: '9ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b',
		publicPointY: '34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3',
	};
	const androidGeneratedKeySet2: TestKeyData = {
		privateKey: 'bce8be7587c4773d4dc3e69416d2f065f2f929fe42acfb8d74c59cfbb1c7a165',
		publicPointX: '882f1fe35041fc769faeacb0731a309a8135c15eb5b37aa81489a467196d463b',
		publicPointY: '214578c4cbe09932a82c92e9e4fd51f84e3bdbb792dd051054b50e9d4cfb9925',
	};
	const androidGeneratedKeySet3: TestKeyData = {
		privateKey: 'ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7aeb',
		publicPointX: '48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f',
		publicPointY: '533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b',
	};

	const rawSecp256k1Keys1: TestKeyData = {
		privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
		publicPointX: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
		publicPointY: '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
	};

	const rawSecp256k1Keys2: TestKeyData = {
		privateKey: '0000000000000000000000000000000000000000000000000000000000000014',
		publicPointX: '4ce119c96e2fa357200b559b2f7dd5a5f02d5290aff74b03f3e471b273211c97',
		publicPointY: '12ba26dcb10ec1625da61fa10a844c676162948271d96967450288ee9233dc3a',
	};

	const metaMaskExtension: TestKeyData = {
		privateKey: '00000000000000000000000000000000000000000000000000000000000000A0',
		publicPointX: '308913a27a52d9222bc776838f73f576a4d047122a9b184b05ec32ad51b03f6c',
		publicPointY: 'f4a5b09543febe5f91e3531f66c0375da8333fea82bd1f1260ab5efce8fe4c67',
	};

	it('- Success Generation', () => {
		const result_point1 = ec.curve.point(
			androidGeneratedKeySet1.publicPointX,
			androidGeneratedKeySet1.publicPointY
		);
		const result_js1 = ec.g.mul(androidGeneratedKeySet1.privateKey);
		expect(result_point1.encode('true', null)).toStrictEqual(result_js1.encode('true', null));
		expect(result_point1.encode('false', null)).toStrictEqual(result_js1.encode('false', null));
		expect(result_point1.encode()).toStrictEqual(result_js1.encode());

		const result_point2 = ec.curve.point(
			androidGeneratedKeySet2.publicPointX,
			androidGeneratedKeySet2.publicPointY
		);
		const result_js2 = ec.g.mul(androidGeneratedKeySet2.privateKey);
		expect(result_point2.encode('true', null)).toStrictEqual(result_js2.encode('true', null));
		expect(result_point2.encode('false', null)).toStrictEqual(result_js2.encode('false', null));
		expect(result_point2.encode()).toStrictEqual(result_js2.encode());

		const result_point3 = ec.curve.point(
			androidGeneratedKeySet3.publicPointX,
			androidGeneratedKeySet3.publicPointY
		);
		const result_js3 = ec.g.mul(androidGeneratedKeySet3.privateKey);
		expect(result_point3.encode('true', null)).toStrictEqual(result_js3.encode('true', null));
		expect(result_point3.encode('false', null)).toStrictEqual(result_js3.encode('false', null));
		expect(result_point3.encode()).toStrictEqual(result_js3.encode());
	});

	it('- Raw SECP256k1 Test Keys Success Generation', () => {
		// https://chuckbatson.wordpress.com/2014/11/26/secp256k1-test-vectors/
		//Curve: secp256k1
		const result_point1 = ec.curve.point(rawSecp256k1Keys1.publicPointX, rawSecp256k1Keys1.publicPointY);
		const result_js1 = ec.g.mul(rawSecp256k1Keys1.privateKey);
		expect(result_point1.encode('true', null)).toStrictEqual(result_js1.encode('true', null));
		expect(result_point1.encode('false', null)).toStrictEqual(result_js1.encode('false', null));
		expect(result_point1.encode()).toStrictEqual(result_js1.encode());

		const result_point2 = ec.curve.point(rawSecp256k1Keys2.publicPointX, rawSecp256k1Keys2.publicPointY);
		const result_js2 = ec.g.mul(rawSecp256k1Keys2.privateKey);
		expect(result_point2.encode('true', null)).toStrictEqual(result_js2.encode('true', null));
		expect(result_point2.encode('false', null)).toStrictEqual(result_js2.encode('false', null));
		expect(result_point2.encode()).toStrictEqual(result_js2.encode());
	});

	it('- MetaMask Extension Test Keys Success Generation', () => {
		const result_point1 = ec.curve.point(metaMaskExtension.publicPointX, metaMaskExtension.publicPointY);
		const result_js1 = ec.g.mul(metaMaskExtension.privateKey);
		expect(result_point1.encode('true', null)).toStrictEqual(result_js1.encode('true', null));
		expect(result_point1.encode('false', null)).toStrictEqual(result_js1.encode('false', null));
		expect(result_point1.encode()).toStrictEqual(result_js1.encode());
	});

	it('- Fails Generation', () => {
		const result_point1 = ec.curve.point(
			androidGeneratedKeySet1.publicPointX,
			androidGeneratedKeySet1.publicPointY
		);
		const result_js1 = ec.g.mul(androidGeneratedKeySet2.privateKey);
		expect(result_point1.encode(true, 'hex') !== result_js1.encode(true, 'hex')).toBe(true);
	});
});
