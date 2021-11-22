interface CountByScreenName {
	[screenName: string]: number;
}

class RenderCounter {
	countByScreenName: CountByScreenName = {};

	recordRender = (screenName: string) => {
		const newCount = (this.countByScreenName[screenName] || 0) + 1;
		this.countByScreenName[screenName] = newCount;
		console.log(`${screenName} - ${newCount}`);
	};
}

export default new RenderCounter();
