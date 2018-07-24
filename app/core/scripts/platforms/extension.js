const extension = require('extensionizer');

class ExtensionPlatform {
	//
	// Public
	//
	reload() {
		extension.runtime.reload();
	}

	openWindow({ url }) {
		extension.tabs.create({ url });
	}

	getVersion() {
		return '4.7.8';
	}

	openExtensionInBrowser() {
		const extensionURL = extension.runtime.getURL('home.html');
		this.openWindow({ url: extensionURL });
	}

	getPlatformInfo(cb) {
		try {
			extension.runtime.getPlatformInfo(platform => {
				cb(null, platform);
			});
		} catch (e) {
			cb(e);
		}
	}
}

module.exports = ExtensionPlatform;
