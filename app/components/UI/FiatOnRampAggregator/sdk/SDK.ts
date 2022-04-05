import { OnRampSdk, IOnRampSdk } from '@chingiz-mardanov/on-ramp-sdk';

class SDK {
	private static instance: IOnRampSdk;

	public static async getSDK(...args: Parameters<typeof OnRampSdk.getSDK>): Promise<IOnRampSdk> {
		if (!this.instance) {
			this.instance = await OnRampSdk.getSDK(...args);
		}
		return this.instance;
	}
}

export default SDK;
