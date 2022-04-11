import { createClient } from '@segment/analytics-react-native';

const DEV_KEY = process.env.SEGMENT_WRITE_KEY_DEV;
const PROD_KEY = process.env.SEGMENT_WRITE_KEY_PROD;

class SegmentManager {
	private client;

	constructor() {
		const writeKey = this.getWriteKey();
		this.client = createClient({
			writeKey,
			trackAppLifecycleEvents: true,
		});
	}

	private getWriteKey(): string {
		const key = process.env.NODE_ENV !== 'production' ? DEV_KEY : PROD_KEY;
		if (typeof key === 'undefined') {
			throw new Error('Error: Segment key not defined');
		}

		return key;
	}
}

const instance = {
	init() {
		return new SegmentManager();
	},
};

export default instance;
