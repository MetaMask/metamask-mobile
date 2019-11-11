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

export const JS_WINDOW_INFORMATION_HEIGHT = os => `
	(function () {
		${getWindowInformation}
		${
			os === 'ios'
				? `setTimeout(() => {
                    const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
                    {
                        type: 'GET_HEIGHT',
                        payload: {
                            height: height
                        }
                    }))
                    }, 500)`
				: ''
		}
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
	const iframes = document.getElementsByTagName('iframe');
	let sent = false;
	for (let frame of iframes){
		if(frame.src === '${origin}'){
			try {
				frame.contentWindow.postMessage(${JSON.stringify(message)}, '${origin}');
			} catch (e) {
				//Nothing to do
			}
		}
	}
})()`;
