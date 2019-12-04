const getWindowInformation = `
    const shortcutIcon = window.document.querySelector('head > link[rel="shortcut icon"]');
    const icon = shortcutIcon || Array.from(window.document.querySelectorAll('head > link[rel="icon"]')).find((icon) => Boolean(icon.href));

    const siteName = document.querySelector('head > meta[property="og:site_name"]');
    const title = siteName || document.querySelector('head > meta[name="title"]');
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
        {
            type: 'GET_TITLE_FOR_BOOKMARK',
            payload: {
                title: title ? title.content : document.title,
                url: location.href,
                icon: icon && icon.href
            }
        }
    ))
`;

export const SPA_urlChangeListener = `(function () {
	var __mmHistory = window.history;
	var __mmPushState = __mmHistory.pushState;
	var __mmReplaceState = __mmHistory.replaceState;
	function __mm__updateUrl(){
		const siteName = document.querySelector('head > meta[property="og:site_name"]');
		const title = siteName || document.querySelector('head > meta[name="title"]') || document.title;
		const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);

		window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
			{
				type: 'NAV_CHANGE',
				payload: {
					url: location.href,
					title: title,
				}
			}
		));

		setTimeout(() => {
			const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);
			window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
			{
				type: 'GET_HEIGHT',
				payload: {
					height: height
				}
			}))
		}, 500);
	}

	__mmHistory.pushState = function(state) {
		setTimeout(function () {
			__mm__updateUrl();
		}, 100);
		return __mmPushState.apply(history, arguments);
	};

	__mmHistory.replaceState = function(state) {
		setTimeout(function () {
			__mm__updateUrl();
		}, 100);
		return __mmReplaceState.apply(history, arguments);
	};

	window.onpopstate = function(event) {
		__mm__updateUrl();
	};
  })();
`;

export const JS_WINDOW_INFORMATION = `
	(function () {
        ${getWindowInformation}
    })();
`;

export const JS_DESELECT_TEXT = `if (window.getSelection) {window.getSelection().removeAllRanges();}
else if (document.selection) {document.selection.empty();}`;

export const JS_POST_MESSAGE_TO_PROVIDER = (message, origin) => `(function () {
	try {
		window.postMessage(${JSON.stringify(message)}, '${origin}');
	} catch (e) {
		//Nothing to do
	}
})()`;

export const JS_IFRAME_POST_MESSAGE_TO_PROVIDER = (message, origin) => `(function () {
	const iframes = document.getElementsByTagName('iframe');
	for (let frame of iframes){

			try {
				frame.contentWindow.postMessage(${JSON.stringify(message)}, '${origin}');
			} catch (e) {
				//Nothing to do
			}

	}
})()`;

export const JS_CONTENT_SCRIPT = entryScriptWeb3 => `
	const inpageBundle = ${JSON.stringify(entryScriptWeb3)};

	/**
	 * Injects a script tag into the current document
	 *
	 * @param {string} content - Code to be executed in the current document
	 */
	function injectScript (content) {
		try {
			const container = document.head || document.documentElement
			const scriptTag = document.createElement('script')
			scriptTag.setAttribute('async', false)
			scriptTag.textContent = content;
			container.insertBefore(scriptTag, container.children[0])
			container.removeChild(scriptTag)
		} catch (e) {
			console.error('MetaMask script injection failed', e)
		}
	}

	/**
	 * Determines if Web3 should be injected
	 *
	 * @returns {boolean} {@code true} if Web3 should be injected
	 */
	function shouldInjectWeb3 () {
		return doctypeCheck() && suffixCheck() &&
			documentElementCheck() && !blacklistedDomainCheck()
	}

	/**
	 * Checks the doctype of the current document if it exists
	 *
	 * @returns {boolean} {@code true} if the doctype is html or if none exists
	 */
	function doctypeCheck () {
		const doctype = window.document.doctype
		if (doctype) {
			return doctype.name === 'html'
		} else {
			return true
		}
	}

	/**
	 * Returns whether or not the extension (suffix) of the current document is prohibited
	 *
	 * This checks {@code window.location.pathname} against a set of file extensions
	 * that should not have web3 injected into them. This check is indifferent of query parameters
	 * in the location.
	 *
	 * @returns {boolean} whether or not the extension of the current document is prohibited
	 */
	function suffixCheck () {
		const prohibitedTypes = [
			/\\.xml$/,
			/\\.pdf$/,
		]
		const currentUrl = window.location.pathname
		for (let i = 0; i < prohibitedTypes.length; i++) {
			if (prohibitedTypes[i].test(currentUrl)) {
			return false
			}
		}
		return true
	}

	/**
	 * Checks the documentElement of the current document
	 *
	 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
	 */
	function documentElementCheck () {
		const documentElement = document.documentElement.nodeName
		if (documentElement) {
			return documentElement.toLowerCase() === 'html'
		}
		return true
	}

	/**
	 * Checks if the current domain is blacklisted
	 *
	 * @returns {boolean} {@code true} if the current domain is blacklisted
	 */
	function blacklistedDomainCheck () {
		const blacklistedDomains = [
			'uscourts.gov',
			'dropbox.com',
			'webbyawards.com',
			'cdn.shopify.com/s/javascripts/tricorder/xtld-read-only-frame.html',
			'adyen.com',
			'gravityforms.com',
			'harbourair.com',
			'ani.gamer.com.tw',
			'blueskybooking.com',
			'sharefile.com',
		]
		const currentUrl = window.location.href
		let currentRegex
		for (let i = 0; i < blacklistedDomains.length; i++) {
			const blacklistedDomain = blacklistedDomains[i].replace('.', '\\.')
			currentRegex = new RegExp("(?:https?:\\/\\/)(?:(?!"+blacklistedDomain+").)*$")
			if (!currentRegex.test(currentUrl)) {
			return true
			}
		}
		return false
	}

	/**
	 * Returns a promise that resolves when the DOM is loaded (does not wait for images to load)
	 */
	async function domIsReady () {
		// already loaded
		if (['interactive', 'complete'].includes(document.readyState)) {
			return
		}
		// wait for load
		await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }))
	}

	/**
	 * Sets up the stream communication and submits site metadata
	 *
	 */
	async function start () {
		await domIsReady()
		window.setupStreams()
	}

	if (shouldInjectWeb3()) {
		//injectScript(inpageBundle)
		start()
		if(window !== top) {
			window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
				{
					type: 'FRAME_READY',
					payload: {
						url: window.location.href,
					}
				}
			));

			window.addEventListener('message', message => {
				if(message.data.name === "publicConfig"){
					// Manual update for Iframes
					const { data } = message.data;
					if(data.isUnlocked !== window.ethereum.isUnlocked ||
					data.isEnabled !== window.ethereum.isEnabled ||
					data.selectedAddress !== window.ethereum.selectedAddress ||
					data.networkVersion !== window.ethereum.networkVersion ||
					data.networkVersion !== window.ethereum.networkVersion ||
					data.chainId !== window.ethereum.chainId){
						window.ethereum.publicConfigStore.emit('update', message.data.data);
					}
				}
			});
		}
	}
`;
