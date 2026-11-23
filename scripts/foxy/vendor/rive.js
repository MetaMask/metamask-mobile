(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["rive"] = factory();
	else
		root["rive"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Animation: () => (/* reexport safe */ _Animation__WEBPACK_IMPORTED_MODULE_0__.Animation)
/* harmony export */ });
/* harmony import */ var _Animation__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);



/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Animation: () => (/* binding */ Animation)
/* harmony export */ });
/**
 * Represents an animation that can be played on an Artboard.
 * Wraps animations and instances from the runtime and keeps track of playback state.
 *
 * The `Animation` class manages the state and behavior of a single animation instance,
 * including its current time, loop count, and ability to scrub to a specific time.
 *
 * The class provides methods to advance the animation, apply its interpolated keyframe
 * values to the Artboard, and clean up the underlying animation instance when the
 * animation is no longer needed.
 */
var Animation = /** @class */ (function () {
    /**
     * Constructs a new animation
     * @constructor
     * @param {any} animation: runtime animation object
     * @param {any} instance: runtime animation instance object
     */
    function Animation(animation, artboard, runtime, playing) {
        this.animation = animation;
        this.artboard = artboard;
        this.playing = playing;
        this.loopCount = 0;
        /**
         * The time to which the animation should move to on the next render.
         * If not null, the animation will scrub to this time instead of advancing by the given time.
         */
        this.scrubTo = null;
        this.instance = new runtime.LinearAnimationInstance(animation, artboard);
    }
    Object.defineProperty(Animation.prototype, "name", {
        /**
         * Returns the animation's name
         */
        get: function () {
            return this.animation.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animation.prototype, "time", {
        /**
         * Returns the animation's name
         */
        get: function () {
            return this.instance.time;
        },
        /**
         * Sets the animation's current time
         */
        set: function (value) {
            this.instance.time = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animation.prototype, "loopValue", {
        /**
         * Returns the animation's loop type
         */
        get: function () {
            return this.animation.loopValue;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animation.prototype, "needsScrub", {
        /**
         * Indicates whether the animation needs to be scrubbed.
         * @returns `true` if the animation needs to be scrubbed, `false` otherwise.
         */
        get: function () {
            return this.scrubTo !== null;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Advances the animation by the give time. If the animation needs scrubbing,
     * time is ignored and the stored scrub value is used.
     * @param time the time to advance the animation by if no scrubbing required
     */
    Animation.prototype.advance = function (time) {
        if (this.scrubTo === null) {
            this.instance.advance(time);
        }
        else {
            this.instance.time = 0;
            this.instance.advance(this.scrubTo);
            this.scrubTo = null;
        }
    };
    /**
     * Apply interpolated keyframe values to the artboard. This should be called after calling
     * .advance() on an animation instance so that new values are applied to properties.
     *
     * Note: This does not advance the artboard, which updates all objects on the artboard
     * @param mix - Mix value for the animation from 0 to 1
     */
    Animation.prototype.apply = function (mix) {
        this.instance.apply(mix);
    };
    /**
     * Deletes the backing Wasm animation instance; once this is called, this
     * animation is no more.
     */
    Animation.prototype.cleanup = function () {
        this.instance.delete();
    };
    return Animation;
}());



/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RuntimeLoader: () => (/* binding */ RuntimeLoader)
/* harmony export */ });
/* harmony import */ var _rive_advanced_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var _rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var package_json__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};



// A module with a shared memory, an atomic load and a SIMD constant.
var threadsProbe = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x09, 0x02, 0x60, 0x00,
    0x01, 0x7f, 0x60, 0x00, 0x01, 0x7b, 0x03, 0x03, 0x02, 0x00, 0x01, 0x05, 0x04,
    0x01, 0x03, 0x01, 0x01, 0x0a, 0x1f, 0x02, 0x08, 0x00, 0x41, 0x00, 0xfe, 0x10,
    0x02, 0x00, 0x0b, 0x14, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0b,
]);
// Words for the refusals the loader warns about when it decides; the
// package's and host's choices stay silent.
var pageRefusalWords = {
    notIsolated: "the page is not cross origin isolated",
    isolationUnsupported: "the page is not cross origin isolated",
    noSharedMemory: "the page cannot share memory with workers",
    noWasmThreads: "the browser cannot run wasm threads with SIMD",
};
// A page that is not isolated gets no shared memory, and the threaded build
// never loads.
function pageThreadsRefusal() {
    if (globalThis.crossOriginIsolated !== true) {
        return globalThis.crossOriginIsolated === undefined
            ? "isolationUnsupported"
            : "notIsolated";
    }
    try {
        new MessageChannel().port1.postMessage(new SharedArrayBuffer(1));
    }
    catch (_a) {
        return "noSharedMemory";
    }
    if (typeof WebAssembly !== "object" || !WebAssembly.validate(threadsProbe)) {
        return "noWasmThreads";
    }
    return null;
}
// Whole bytes that fit in a uint32; 0 keeps the runtime's default.
var responseBytesOption = function (value) {
    return typeof value === "number" && value > 0
        ? Math.min(Math.max(Math.floor(value), 1), 0xffffffff)
        : 0;
};
var hostPattern = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*$/;
// Warns about allowedHosts entries that never match, or match a whole
// top-level domain.
var checkAllowedHosts = function (hosts) {
    for (var _i = 0, hosts_1 = hosts; _i < hosts_1.length; _i++) {
        var entry = hosts_1[_i];
        var host = String(entry).trim().toLowerCase();
        if (host === "*") {
            continue;
        }
        if (!hostPattern.test(host)) {
            console.warn("[Rive] allowedHosts entry \"".concat(entry, "\" never matches. Use a host name ") +
                "(\"api.example.com\"), \"*.example.com\" or \"*\".");
        }
        else if (host.startsWith("*.") && !host.includes(".", 2)) {
            console.warn("[Rive] allowedHosts entry \"".concat(entry, "\" allows every host under a ") +
                "top-level domain.");
        }
    }
};
// Warns about a proxy on this page's own origin, where the iframe's sandbox
// keeps nothing apart from the page.
var checkProxyUrl = function (proxyUrl) {
    var origin;
    try {
        origin = new URL(proxyUrl, document.baseURI).origin;
    }
    catch (_a) {
        return;
    }
    if (origin === location.origin) {
        console.warn("[Rive] proxyUrl \"".concat(proxyUrl, "\" is on this page's origin, so the proxy ") +
            "is not isolated from it. Host it on a separate domain.");
    }
};
// Runtime singleton; use getInstance to provide a callback that returns the
// Rive runtime
var RuntimeLoader = /** @class */ (function () {
    // Class is never instantiated
    function RuntimeLoader() {
    }
    // Rejects all pending awaitInstance() promises and resets loading state so
    // the next call to getInstance() / awaitInstance() can retry with a new URL.
    RuntimeLoader.notifyError = function (error) {
        var _a;
        RuntimeLoader.isLoading = false;
        // The retry decides again, so the answer follows the settings until then.
        if (!RuntimeLoader.triedThreads) {
            RuntimeLoader.threadsOutcome = undefined;
        }
        while (RuntimeLoader.errorCallbackQueue.length > 0) {
            (_a = RuntimeLoader.errorCallbackQueue.shift()) === null || _a === void 0 ? void 0 : _a(error);
        }
        RuntimeLoader.callBackQueue = [];
    };
    RuntimeLoader.setSystemLanguages = function (languages) {
        RuntimeLoader.systemLanguages = languages;
        RuntimeLoader.applySystemLanguages();
    };
    RuntimeLoader.applySystemLanguages = function () {
        var _a, _b;
        var rive = RuntimeLoader.runtime;
        if (!rive) {
            // Applied once it loads.
            return;
        }
        var languages = (_a = RuntimeLoader.systemLanguages) !== null && _a !== void 0 ? _a : (typeof navigator !== "undefined" && navigator.languages
            ? navigator.languages
            : []);
        (_b = rive.setSystemLanguages) === null || _b === void 0 ? void 0 : _b.call(rive, __spreadArray([], languages, true));
    };
    RuntimeLoader.loaded = function (rive) {
        var _a, _b;
        if (RuntimeLoader.enablePerfMarks) {
            performance.mark('rive:wasm-init:end');
            performance.measure('rive:wasm-init', 'rive:wasm-init:start', 'rive:wasm-init:end');
        }
        RuntimeLoader.runtime = rive;
        RuntimeLoader.applyParallelParts();
        RuntimeLoader.applySystemLanguages();
        if (!RuntimeLoader.listeningForLanguageChange &&
            typeof window !== "undefined" &&
            typeof window.addEventListener === "function") {
            RuntimeLoader.listeningForLanguageChange = true;
            window.addEventListener("languagechange", function () {
                if (RuntimeLoader.systemLanguages === null) {
                    RuntimeLoader.applySystemLanguages();
                }
            });
        }
        RuntimeLoader.errorCallbackQueue = [];
        // Before any callback can import a file, so its images reach the worker.
        if (RuntimeLoader.replayWorker) {
            (_a = rive.enableReplayWorker) === null || _a === void 0 ? void 0 : _a.call(rive);
        }
        RuntimeLoader.applyScriptFetch();
        // Fire all the callbacks
        while (RuntimeLoader.callBackQueue.length > 0) {
            (_b = RuntimeLoader.callBackQueue.shift()) === null || _b === void 0 ? void 0 : _b(RuntimeLoader.runtime);
        }
    };
    // Loads the runtime, threaded once per page where it can be, and otherwise
    // without threads.
    RuntimeLoader.loadRuntime = function () {
        if (RuntimeLoader.triedThreads) {
            RuntimeLoader.loadUnthreaded();
            return;
        }
        var refusal = RuntimeLoader.decideThreads();
        RuntimeLoader.threadsOutcome = refusal;
        var words = refusal && pageRefusalWords[refusal];
        // A package's or host's choice stays silent, and a retry decides again.
        if (refusal !== null && !words) {
            RuntimeLoader.loadUnthreaded();
            return;
        }
        RuntimeLoader.triedThreads = true;
        if (words) {
            console.warn("Rive is running without threads: ".concat(words, "."));
            RuntimeLoader.loadUnthreaded();
            return;
        }
        var threadsUrl = RuntimeLoader.wasmThreadsURL;
        if (RuntimeLoader.enablePerfMarks)
            performance.mark('rive:wasm-init:start');
        // Not a catch, which would also take a throw from a callback.
        _rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1___default()({ locateFile: function () { return threadsUrl; } }).then(RuntimeLoader.loaded, function (error) {
            var _a;
            RuntimeLoader.threadsOutcome = "loadFailed";
            console.warn("Rive is running without threads: the threaded build failed to load (".concat((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error, ")."));
            RuntimeLoader.loadUnthreaded();
        });
    };
    // Shared by the loader and threadsRefusal, so the two never disagree.
    RuntimeLoader.decideThreads = function () {
        // Other packages bundle an empty module here, which webpack's interop
        // hands over as an object rather than undefined.
        if (typeof (_rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1___default()) !== "function") {
            return "noThreadedBuild";
        }
        if (RuntimeLoader.wasmThreadsURL === null) {
            return "threadsOff";
        }
        // A host's own binary is a build without threads.
        if (RuntimeLoader.wasmBinary !== null) {
            return "wasmBinary";
        }
        return pageThreadsRefusal();
    };
    RuntimeLoader.loadUnthreaded = function () {
        // Capture the URL at call time so the catch closure always refers to the
        // URL this particular attempt used, even if wasmURL is mutated for a retry.
        var attemptedUrl = RuntimeLoader.wasmURL;
        var wasmBinary = RuntimeLoader.wasmBinary;
        if (RuntimeLoader.enablePerfMarks)
            performance.mark('rive:wasm-init:start');
        _rive_advanced_mjs__WEBPACK_IMPORTED_MODULE_0__["default"](__assign({ 
            // Loads Wasm bundle
            locateFile: function () { return attemptedUrl; } }, (wasmBinary ? { wasmBinary: wasmBinary } : {})))
            .then(RuntimeLoader.loaded)
            .catch(function (error) {
            // Capture specific error details
            var errorDetails = {
                message: (error === null || error === void 0 ? void 0 : error.message) || "Unknown error",
                type: (error === null || error === void 0 ? void 0 : error.name) || "Error",
                // Some browsers may provide additional WebAssembly-specific details
                wasmError: typeof WebAssembly !== "undefined" &&
                    (error instanceof WebAssembly.CompileError ||
                        error instanceof WebAssembly.RuntimeError),
                originalError: error,
            };
            // Log detailed error for debugging
            console.debug("Rive WASM load error details:", errorDetails);
            // In case the primary URL fails, or the wasm was not supported, try the
            // fallback URL (a rive_fallback.wasm compiled for older architectures).
            // The fallback can be customised or disabled via setWasmFallbackUrl().
            // TODO: (Gordon): preemptively test browser support and load the correct wasm file. Then use the fallback only if the primary fails.
            var fallbackUrl = RuntimeLoader.wasmFallbackURL;
            var alreadyOnFallback = fallbackUrl !== null &&
                attemptedUrl.toLowerCase() === fallbackUrl.toLowerCase();
            if (fallbackUrl !== null && !alreadyOnFallback) {
                console.warn("Failed to load WASM from ".concat(attemptedUrl, " (").concat(errorDetails.message, "), trying fallback URL: ").concat(fallbackUrl));
                // Clear wasmBinary so the retry actually fetches via locateFile
                // instead of re-using the same (failing) in-memory binary.
                RuntimeLoader.wasmBinary = null;
                RuntimeLoader.setWasmUrl(fallbackUrl);
                RuntimeLoader.loadUnthreaded();
            }
            else {
                // When alreadyOnFallback is true, wasmURL has already been overwritten
                // with the fallback URL, so we can no longer recover the original
                // primary URL here. The primary URL was logged in the earlier warning.
                var triedUrls = alreadyOnFallback
                    ? "the configured WASM URL or its fallback (".concat(fallbackUrl, ")")
                    : attemptedUrl;
                var errorMessage = [
                    "Could not load Rive WASM file from ".concat(triedUrls, "."),
                    "Possible reasons:",
                    "- Network connection is down",
                    "- WebAssembly is not supported in this environment",
                    "- The WASM file is corrupted or incompatible",
                    "\nError details:",
                    "- Type: ".concat(errorDetails.type),
                    "- Message: ".concat(errorDetails.message),
                    "- WebAssembly-specific error: ".concat(errorDetails.wasmError),
                    "\nTo resolve, you may need to:",
                    "1. Check your network connection",
                    "2. Set a new WASM source via RuntimeLoader.setWasmUrl()",
                    "3. Call RuntimeLoader.awaitInstance() again",
                ].join("\n");
                console.error(errorMessage);
                RuntimeLoader.notifyError(new Error(errorMessage));
            }
        });
    };
    // Provides a runtime instance via a callback
    RuntimeLoader.getInstance = function (callback, onError) {
        // If it's not loading, start loading runtime
        if (!RuntimeLoader.isLoading) {
            RuntimeLoader.isLoading = true;
            RuntimeLoader.loadRuntime();
        }
        if (!RuntimeLoader.runtime) {
            RuntimeLoader.callBackQueue.push(callback);
            if (onError) {
                RuntimeLoader.errorCallbackQueue.push(onError);
            }
        }
        else {
            callback(RuntimeLoader.runtime);
        }
    };
    // Provides a runtime instance via a promise; rejects if WASM fails to load.
    RuntimeLoader.awaitInstance = function () {
        return new Promise(function (resolve, reject) {
            return RuntimeLoader.getInstance(resolve, reject);
        });
    };
    /**
     * @internal Resolves once the replay worker's device caps reach the page,
     * so scripts init against them. Null when there is nothing left to wait
     * for, which keeps every later instance's load synchronous.
     */
    RuntimeLoader.awaitReplayCaps = function () {
        var _a, _b;
        if (RuntimeLoader.replayCapsArrived) {
            return null;
        }
        var pending = (_b = (_a = RuntimeLoader.runtime) === null || _a === void 0 ? void 0 : _a.awaitReplayCaps) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (!pending) {
            return null;
        }
        // A worker that never answers must not hold every load back; its caps
        // then bind when the surface does, as before.
        var timeout = new Promise(function (resolve) {
            return setTimeout(resolve, RuntimeLoader.replayCapsTimeoutMs);
        });
        return Promise.race([pending, timeout]).then(function () {
            RuntimeLoader.replayCapsArrived = true;
        });
    };
    // Manually sets the wasm url
    RuntimeLoader.setWasmUrl = function (url) {
        RuntimeLoader.wasmURL = url;
    };
    // Gets the current wasm url
    RuntimeLoader.getWasmUrl = function () {
        return RuntimeLoader.wasmURL;
    };
    /**
     * Sets the URL used as a fallback when the primary WASM URL fails to load.
     * Pass `null` to disable the fallback entirely.
     *
     * Defaults to pulling from the jsdelivr CDN.
     */
    RuntimeLoader.setWasmFallbackUrl = function (url) {
        RuntimeLoader.wasmFallbackURL = url;
    };
    // Gets the current fallback wasm url (null means fallback is disabled)
    RuntimeLoader.getWasmFallbackUrl = function () {
        return RuntimeLoader.wasmFallbackURL;
    };
    /**
     * Sets the URL of the threaded build's wasm, which
     * `@rive-app/webgl2-threads` loads on a cross origin isolated page. Pass
     * `null` to always load the build without threads. Other packages have no
     * threaded build and ignore it.
     *
     * Defaults to pulling from the unpkg CDN.
     */
    RuntimeLoader.setWasmThreadsUrl = function (url) {
        RuntimeLoader.wasmThreadsURL = url;
    };
    // Gets the threaded build's wasm url (null means threads are off)
    RuntimeLoader.getWasmThreadsUrl = function () {
        return RuntimeLoader.wasmThreadsURL;
    };
    /**
     * @experimental Why this page doesn't run the threaded build, or null when
     * it does. Before load, what the loader would do with the current settings;
     * after, what it did. Never loads or logs.
     */
    RuntimeLoader.threadsRefusal = function () {
        return RuntimeLoader.threadsOutcome === undefined
            ? RuntimeLoader.decideThreads()
            : RuntimeLoader.threadsOutcome;
    };
    /**
     * Sets how many parts a script's parallel call gets on a page that runs
     * the threaded build, the page's thread and one worker thread for each
     * other part. 1 turns parallel calls off, and null leaves the runtime's
     * default of one part per core, up to 8. Set it before the first file
     * loads.
     */
    RuntimeLoader.setParallelParts = function (parts) {
        RuntimeLoader.parallelParts = parts;
        RuntimeLoader.applyParallelParts();
    };
    // Gets the parts set with setParallelParts (null means the default)
    RuntimeLoader.getParallelParts = function () {
        return RuntimeLoader.parallelParts;
    };
    RuntimeLoader.applyParallelParts = function () {
        var _a;
        var scripting = (_a = RuntimeLoader.runtime) === null || _a === void 0 ? void 0 : _a.riveScripting;
        if (scripting) {
            scripting.parallelParts = RuntimeLoader.parallelParts;
        }
    };
    /**
     * @experimental When the threaded build loads, instances with
     * `enableGPUCanvas` hand their canvas to one worker that replays every
     * instance's frames while the page records the next ones. Pass `false`
     * before the runtime loads to keep replay on the page's thread; a single
     * instance can opt out with `useReplayWorker: false`. Pages where the
     * browser cannot draw WebGL2 on a transferred canvas stay on the page's
     * thread regardless.
     *
     * True by default.
     */
    RuntimeLoader.setReplayWorker = function (enabled) {
        RuntimeLoader.replayWorker = enabled;
    };
    // Gets whether a threaded runtime may replay on a worker
    RuntimeLoader.getReplayWorker = function () {
        return RuntimeLoader.replayWorker;
    };
    /**
     * @experimental Lets scripts in Rive files call `fetch()`. Pass `true` or
     * options to enable it for every file on the page, `false` to disable it.
     * Only `@rive-app/webgl2-threads` running its threaded build has it;
     * elsewhere this warns once and does nothing.
     *
     * Enabling it lets any script in any file this page loads send what it
     * can read to the hosts it may reach. Limit them with `allowedHosts`.
     * Scripts can't fetch this page's own host unless `allowedHosts` names it.
     *
     * Each call replaces the previous options, and any option left out goes
     * back to its default (an omitted `allowedHosts` allows every host). To
     * change one option, spread the current ones:
     *
     * ```ts
     * RuntimeLoader.setScriptFetch({
     *   ...RuntimeLoader.getScriptFetch(),
     *   maxResponseBytes: 32 * 1024 * 1024,
     * });
     * ```
     *
     * Disabled by default.
     */
    RuntimeLoader.setScriptFetch = function (options) {
        if (options === true) {
            RuntimeLoader.scriptFetch = {};
        }
        else if (options && typeof options === "object") {
            var hosts = options.allowedHosts;
            // Anything else, such as a single host as a string, allows no host
            // rather than falling back to every host.
            if (hosts != null && !Array.isArray(hosts)) {
                console.warn("[Rive] allowedHosts must be an array of host names. Scripts may " +
                    "fetch from no host.");
                hosts = [];
            }
            if (hosts) {
                checkAllowedHosts(hosts);
            }
            if (options.proxyUrl) {
                checkProxyUrl(options.proxyUrl);
            }
            RuntimeLoader.scriptFetch = __assign(__assign({}, options), { allowedHosts: hosts === null || hosts === void 0 ? void 0 : hosts.slice() });
        }
        else {
            RuntimeLoader.scriptFetch = null;
        }
        RuntimeLoader.applyScriptFetch();
    };
    // Gets the script fetch options (null means disabled)
    RuntimeLoader.getScriptFetch = function () {
        var _a;
        var options = RuntimeLoader.scriptFetch;
        return options
            ? __assign(__assign({}, options), { allowedHosts: (_a = options.allowedHosts) === null || _a === void 0 ? void 0 : _a.slice() }) : null;
    };
    RuntimeLoader.applyScriptFetch = function () {
        var _a;
        var runtime = RuntimeLoader.runtime;
        if (!runtime) {
            return;
        }
        var options = RuntimeLoader.scriptFetch;
        if (!runtime.configureScriptFetch) {
            if (options && !RuntimeLoader.warnedNoScriptFetch) {
                RuntimeLoader.warnedNoScriptFetch = true;
                console.warn("[Rive] Script fetch is only available in @rive-app/webgl2-threads " +
                    "on a cross origin isolated page. Scripts' fetch() stays disabled.");
            }
            return;
        }
        runtime.configureScriptFetch(options && {
            proxyUrl: options.proxyUrl || null,
            allowedHosts: (_a = options.allowedHosts) !== null && _a !== void 0 ? _a : null,
            maxResponseBytes: responseBytesOption(options.maxResponseBytes),
        });
    };
    // Manually sets the wasm binary or clears it with null
    RuntimeLoader.setWasmBinary = function (value) {
        if ((value instanceof ArrayBuffer) || value === null) {
            RuntimeLoader.wasmBinary = value;
            return;
        }
        console.error("setWasmBinary expects an ArrayBuffer or null");
    };
    // Gets the current wasm build as ArrayBuffer or null
    RuntimeLoader.getWasmBinary = function () {
        return RuntimeLoader.wasmBinary;
    };
    // Flag to indicate that loading has started/completed
    RuntimeLoader.isLoading = false;
    // List of callbacks for the runtime that come in while loading
    RuntimeLoader.callBackQueue = [];
    // Path to the Wasm file; default path works for testing only;
    // if embedded wasm is used then this is never used.
    RuntimeLoader.wasmURL = "https://unpkg.com/".concat(package_json__WEBPACK_IMPORTED_MODULE_2__.name, "@").concat(package_json__WEBPACK_IMPORTED_MODULE_2__.version, "/rive.wasm");
    // Fallback WASM URL tried when the primary URL fails. Set to null to disable
    // the fallback entirely. Defaults to pulling from the jsdelivr CDN.
    RuntimeLoader.wasmFallbackURL = "https://cdn.jsdelivr.net/npm/".concat(package_json__WEBPACK_IMPORTED_MODULE_2__.name, "@").concat(package_json__WEBPACK_IMPORTED_MODULE_2__.version, "/rive_fallback.wasm");
    RuntimeLoader.wasmBinary = null;
    // The threaded build's wasm, tried first on a page that can run it. Null
    // in packages without one, or to stay on the build without threads.
    RuntimeLoader.wasmThreadsURL = typeof (_rive_threads_mjs__WEBPACK_IMPORTED_MODULE_1___default()) === "function"
        ? "https://unpkg.com/".concat(package_json__WEBPACK_IMPORTED_MODULE_2__.name, "@").concat(package_json__WEBPACK_IMPORTED_MODULE_2__.version, "/rive_threads.wasm")
        : null;
    RuntimeLoader.triedThreads = false;
    // The parts a script's parallel call gets on the threaded build, or null
    // for the runtime's default.
    RuntimeLoader.parallelParts = null;
    // Whether a threaded runtime replays deferred frames on a worker.
    RuntimeLoader.replayWorker = true;
    RuntimeLoader.replayCapsArrived = false;
    RuntimeLoader.replayCapsTimeoutMs = 2000;
    // Script fetch options, or null while disabled.
    RuntimeLoader.scriptFetch = null;
    RuntimeLoader.warnedNoScriptFetch = false;
    // Error callbacks enqueued from .getInstance()
    RuntimeLoader.errorCallbackQueue = [];
    /**
     * When true, performance.mark / performance.measure entries are emitted for
     * WASM initialization.
     */
    RuntimeLoader.enablePerfMarks = false;
    // The languages text without one of its own shapes and falls back with,
    // most preferred first. Null follows navigator.languages, including when
    // the browser's change. See RiveFont.setSystemLanguages.
    RuntimeLoader.systemLanguages = null;
    RuntimeLoader.listeningForLanguageChange = false;
    return RuntimeLoader;
}());



/***/ }),
/* 4 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var Rive=(()=>{var _scriptName=globalThis.document?.currentScript?.src;return async function(moduleArg={}){var moduleRtn;var F=moduleArg,na=!!globalThis.window,ta=!!globalThis.WorkerGlobalScope;
function za(){let d=null,h=null;const m=(D,G,E)=>{const K=D?-1:1;let R=0,X=0,Y=new Map;const U=la=>{const ca=Y;X=R=0;Y=new Map;ca.forEach(wa=>{try{wa(la)}catch(Fa){console.error(Fa)}});this.tc();d&&d.Gd(D)};return{add:la=>{R||=G(U);const ca=++X;Y.set(ca,la);return K*ca},remove:la=>{Y.delete(K*la);R&&0==Y.size&&(E(R),R=0)}}},u=m(!1,D=>requestAnimationFrame(D),D=>cancelAnimationFrame(D)),A=m(!0,D=>null.request(D),D=>null.cancel(D));this.requestAnimationFrame=function(D){return u.add(D)};this.cancelAnimationFrame=
function(D){(0>D?A:u).remove(D)};this.Bd=function(D){h&&(document.body.remove(h),h=null);D||(h=document.createElement("div"),h.style.backgroundColor="black",h.style.position="fixed",h.style.right=0,h.style.top=0,h.style.color="white",h.style.padding="4px",h.innerHTML="RIVE FPS",D=function(G){h.innerHTML="RIVE FPS "+G.toFixed(1)},document.body.appendChild(h));d=new function(){let G=[0,0],E=0;this.Gd=function(K){const R=performance.now();E?(++G[K?1:0],K=R-E,1E3<K&&(D(1E3*Math.max(G[0],G[1])/K),E=0)):
(E=R,G=[0,0])}}};this.yd=function(){h&&(document.body.remove(h),h=null);d=null};this.tc=function(){}}function Ba(){console.assert(!0);const d=new Map;let h=-Infinity;this.push=function(m){m=m+255>>8;d.has(m)&&clearTimeout(d.get(m));d.set(m,setTimeout(function(){d.delete(m);0==d.length?h=-Infinity:m==h&&(h=Math.max(...d.keys()),console.assert(h<m))},1E3));h=Math.max(m,h);return h<<8}}
function Ha(d){return function(){d();const h=F.riveScripting;if(h)for(const m of h.frameBoundary())console.warn(m)}}const La=F.onRuntimeInitialized;
F.onRuntimeInitialized=function(){function d(){F.onAssetChange&&F.onAssetChange()}La&&La();F.startFileScripts=function(E){const K=F.riveScripting;return E&&K&&E.startScripts?K.prepare().then(function(){E.startScripts();return E}):Promise.resolve(E)};let h=F.decodeAudio;F.decodeAudio=function(E,K,R=null){E=h(E,R??null);K(E)};let m=F.decodeFont;F.decodeFont=function(E,K,R=null){E=m(E,R??null);K(E)};const u=F.FileAsset.prototype.decode;F.FileAsset.prototype.decode=function(E,K){E=u.call(this,E,K??null);
d();return E};[["ImageAsset","setRenderImage"],["FontAsset","setFont"],["AudioAsset","setAudioSource"]].forEach(function([E,K]){if(F[E]){E=F[E].prototype;var R=E[K];E[K]=function(X){R.call(this,X);d()}}});let A=F.setFallbackFontCb;F.setFallbackFontCallback="function"===typeof A?function(E){A(E)}:function(){console.warn("Module.setFallbackFontCallback called, but text support is not enabled in this build.")};"function"!==typeof F.setSystemLanguages&&(F.setSystemLanguages=function(){});const D=F.FileAssetLoader;
F.ptrToAsset=E=>{let K=F.ptrToFileAsset(E);return K.isImage?F.ptrToImageAsset(E):K.isFont?F.ptrToFontAsset(E):K.isAudio?F.ptrToAudioAsset(E):K};F.CustomFileAssetLoader=D.extend("CustomFileAssetLoader",{__construct:function({loadContents:E}){this.__parent.__construct.call(this);this.bd=E},loadContents:function(E,K){E=F.ptrToAsset(E);return this.bd(E,K)}});F.CDNFileAssetLoader=D.extend("CDNFileAssetLoader",{__construct:function(E){this.__parent.__construct.call(this);this.fd=E??null},loadContents:function(E){let K=
F.ptrToAsset(E);E=K.cdnUuid;if(""===E)return!1;const R=this.fd??null;(function(X,Y){var U=new XMLHttpRequest;U.responseType="arraybuffer";U.onreadystatechange=function(){4==U.readyState&&200==U.status&&Y(U)};U.open("GET",X,!0);U.send(null)})(K.cdnBaseUrl+"/"+E,X=>{K.decode(new Uint8Array(X.response),R)});return!0}});F.FallbackFileAssetLoader=D.extend("FallbackFileAssetLoader",{__construct:function(){this.__parent.__construct.call(this);this.pc=[]},addLoader:function(E){this.pc.push(E)},loadContents:function(E,
K){for(let R of this.pc)if(R.loadContents(E,K))return!0;return!1}});let G=F.computeAlignment;F.computeAlignment=function(E,K,R,X,Y=1){return G.call(this,E,K,R,X,Y)}};
(function(){function d(q,a,f=null){const c=q.pd,n=q.Ia,p=q.Ha,t=q.Va??{i:!1};let k=null;const b=()=>{const z=a().buffer;if(null===k||k.buffer!==z)k=new Uint8Array(z);return k},e=(z,x)=>{if(0>x||(z>>>0)+x>b().length)throw new RangeError("module range out of bounds");z=4096<x?q.Gb(x):q.hb(x);if(0===z)throw Error(`could not stage ${x} bytes for the host`);return z},g=(z,x)=>{const r=e(z,x);z>>>=0;q.ga().set(k.subarray(z,z+x),r);t.i&&(t.Ta+=x);return r},l=(z,x)=>{0!==z&&4096<x&&q.ra(z)},w=(z,x,r)=>{0!==
r&&(b().set(q.ga().subarray(z,z+r),x>>>0),t.i&&(t.Ra+=r))},I=(z,x)=>{const r=A(a().buffer,z),y=n();let v=0;try{v=g(z,r),x(v,r)}finally{l(v,r),p(y)}},O=z=>x=>I(x,(r,y)=>c.eg(z,r,y));return{env:{seed:()=>Date.now()*Math.random(),emscripten_get_now:()=>performance.now(),emscripten_date_now:()=>Date.now(),trace:(z,x,r,y,v,C,L)=>I(z,(S,pa)=>c.Dl(S,pa,x,r,y,v,C,L)),"console.caller":()=>{},"console.log":O(0),"console.debug":O(0),"console.info":O(0),"console.warn":O(0),"console.error":O(0),"console.time":O(1),
"console.timeLog":O(2),"console.timeEnd":O(3)},rive_rt_v1:(null===f||"rive_rt_v1"===f)&&{log:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.Ek(z,v,r)}finally{l(v,r),p(y)}},mark_needs_update:c.Fk,budget_exceeded:c.yk,error:(z,x)=>{const r=n();let y=0;try{y=g(z,x),c.Ck(y,x)}finally{l(y,x),p(r)}},now:()=>performance.now(),date_now:()=>Date.now(),features:()=>7,debug_enter:c.zk,debug_line:c.Bk,debug_leave:c.Ak,utc_offset:c.Gk,is_dst:c.Dk,zone_name:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Hk(z,
v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},arg:(z,x,r,y)=>{const v=n();let C=0,L=0;try{C=g(z,x);L=g(r,y);const S=c.xk(C,x,L,y);w(L,r,y);return S}finally{l(L,y),l(C,x),p(v)}},release_pages:()=>{}},rive_data_v1:(null===f||"rive_data_v1"===f)&&{view_model:c.ih,root_view_model:c.bh,global_view_model:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Gg(z,v,r)}finally{l(v,r),p(y)}},global_view_model_names:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Hg(z,v,r);w(v,x,r);return C}finally{l(v,r),
p(y)}},context:c.tg,context_parent:c.wg,context_view_model:c.yg,context_release:c.xg,context_equal:c.ug,context_identity:c.vg,has_view_model:(z,x)=>{const r=n();let y=0;try{return y=g(z,x),c.Ig(y,x)}finally{l(y,x),p(r)}},new_view_model:(z,x,r,y)=>{const v=n();let C=0,L=0;try{return C=g(z,x),L=g(r,y),c.Wg(C,x,L,y)}finally{l(L,y),l(C,x),p(v)}},vmi_release:c.yh,vmi_number:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.wh(z,v,r)}finally{l(v,r),p(y)}},vmi_boolean:(z,x,r)=>{const y=n();let v=0;try{return v=
g(x,r),c.nh(z,v,r)}finally{l(v,r),p(y)}},vmi_string:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.zh(z,v,r)}finally{l(v,r),p(y)}},vmi_trigger:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Bh(z,v,r)}finally{l(v,r),p(y)}},vmi_color:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.oh(z,v,r)}finally{l(v,r),p(y)}},vmi_view_model:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ch(z,v,r)}finally{l(v,r),p(y)}},vmi_property:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{L=g(x,r);S=g(y,4*v);const pa=
c.xh(z,L,r,S,v);w(S,y,4*v);return pa}finally{l(S,4*v),l(L,r),p(C)}},vmi_instance:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.uh(z,v,r)}finally{l(v,r),p(y)}},vmi_symbol_index:c.Ah,vmi_equal:c.qh,vmi_identity:c.sh,view_model_get:c.jh,vmi_list:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.vh(z,v,r)}finally{l(v,r),p(y)}},vmi_enum:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.ph(z,v,r)}finally{l(v,r),p(y)}},vmi_image:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.th(z,v,r)}finally{l(v,
r),p(y)}},vmi_font:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.rh(z,v,r)}finally{l(v,r),p(y)}},vmi_blob:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.mh(z,v,r)}finally{l(v,r),p(y)}},vmi_artboard:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.lh(z,v,r)}finally{l(v,r),p(y)}},image_get:c.Jg,image_set:c.Kg,font_get:c.Dg,font_set:c.Fg,font_release:c.Eg,blob_present:c.lg,blob_get:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.jg(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},blob_read:(z,
x,r,y)=>{const v=n();let C=0;try{C=e(r,y);const L=c.mg(z,x,C,y);w(C,r,L>>>0<=y?L>>>0:0);return L}finally{l(C,y),p(v)}},blob_name:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.kg(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},blob_set:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.og(z,v,r)}finally{l(v,r),p(y)}},blob_clear:c.ig,blob_seen:c.ng,blob_changed:c.hg,artboard_get:c.fg,artboard_set:c.gg,enum_get:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Ag(z,v,r);w(v,x,r);return C}finally{l(v,
r),p(y)}},enum_set:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.Bg(z,v,r)}finally{l(v,r),p(y)}},enum_values:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Cg(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},prop_release:c.ah,prop_equal:c.Zg,prop_identity:c.$g,trigger_fire:c.gh,list_length:c.Og,list_push:c.Qg,list_pop:c.Pg,list_shift:c.Ug,list_clear:c.Lg,list_swap:c.Vg,list_insert:c.Ng,list_remove:c.Rg,list_remove_at:c.Tg,list_remove_all_of:c.Sg,list_get:c.Mg,view_model_set:c.kh,color_get:c.rg,
color_set:c.sg,number_get:c.Xg,number_set:c.Yg,boolean_get:c.pg,boolean_set:c.qg,string_get:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.eh(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},string_changed:c.dh,string_set:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.fh(z,v,r)}finally{l(v,r),p(y)}},watch:c.Dh,unwatch:c.hh,convert_result:(z,x,r,y,v,C)=>{const L=n();let S=0;try{S=g(v,C),c.zg(z,x,r,y,S,C)}finally{l(S,C),p(L)}}},rive_artboard_v1:(null===f||"rive_artboard_v1"===f)&&{release:c.Ze,advance:c.ke,
draw:c.se,instance:c.Ee,data:c.re,width:c.ef,height:c.Be,set_width:c.cf,set_height:c.bf,frame_origin:c.ze,set_frame_origin:c.af,bounds:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.qe(z,v,r),w(v,x,4*r)}finally{l(v,4*r),p(y)}},pointer_event:c.Xe,scroll_event:c.$e,gamepad_event:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ae(z,v,r)}finally{l(v,r),p(y)}},keyboard_event:c.Fe,text_event:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.df(z,v,r)}finally{l(v,r),p(y)}},animation:(z,x,r)=>{const y=
n();let v=0;try{return v=g(x,r),c.le(z,v,r)}finally{l(v,r),p(y)}},animation_release:c.oe,animation_duration:c.ne,animation_advance:c.me,animation_set_time:c.pe,add_to_path:c.je,node:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ge(z,v,r)}finally{l(v,r),p(y)}},node_release:c.Se,node_transform:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.Ve(z,v,r),w(v,x,4*r)}finally{l(v,4*r),p(y)}},node_set:c.Te,node_world_transform:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.We(z,v,r),w(v,x,4*r)}finally{l(v,
4*r),p(y)}},node_set_world_transform:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.Ue(z,v,r)}finally{l(v,4*r),p(y)}},node_decompose:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.Je(z,v,r)}finally{l(v,4*r),p(y)}},node_path_verbs:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Qe(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},node_path_points:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.Pe(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},node_paint:(z,x,r)=>{const y=n();let v=0;try{v=
g(x,4*r);const C=c.Ne(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},node_children:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.Ie(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},node_parent:c.Oe,property_key:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ye(z,v,r)}finally{l(v,r),p(y)}},draw_visit:c.ue,draw_modulated:c.te,drawable_draw:c.ve,drawable_value:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,4*y);const L=c.ye(z,x,C,y);w(C,r,4*y);return L}finally{l(C,4*y),p(v)}},drawable_string:(z,
x,r,y)=>{const v=n();let C=0;try{C=g(r,y);const L=c.xe(z,x,C,y);w(C,r,y);return L}finally{l(C,y),p(v)}},drawable_properties:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.we(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},node_ref:c.Re,node_live:c.Le,host_artboard:c.Ce,host_node:c.De,node_name:(z,x,r)=>{const y=n();let v=0;try{v=e(x,r);const C=c.Me(z,v,r);w(v,x,C>>>0<=r?C>>>0:0);return C}finally{l(v,r),p(y)}},node_find:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ke(z,v,r)}finally{l(v,
r),p(y)}},node_artboard_metrics:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.He(z,v,r),w(v,x,4*r)}finally{l(v,4*r),p(y)}}},rive_audio_v1:(null===f||"rive_audio_v1"===f)&&{source:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Bf(z,v,r)}finally{l(v,r),p(y)}},source_release:c.Ef,source_duration:c.Df,source_sample_rate:c.Ff,source_channels:c.Cf,source_to_blob:c.Gf,stream:c.Hf,stream_ring:c.Lf,stream_seeks:c.Of,stream_channels:c.If,stream_sample_rate:c.Mf,stream_seek_frame:c.Nf,stream_set_loop:c.Pf,
stream_ended:c.Jf,stream_release:c.Kf,play:c.ff,play_at_time:c.hf,play_in_time:c.kf,play_at_frame:c.gf,play_in_frame:c.jf,time:c.Qf,time_frame:c.Rf,sample_rate:c.nf,processor_sample_rate:c.mf,processor_channels:c.lf,sound_release:c.sf,sound_play:c.rf,sound_pause:c.qf,sound_resume:c.tf,sound_stop:c.xf,sound_seek:c.uf,sound_seek_frame:c.vf,sound_completed:c.pf,sound_time:c.yf,sound_time_frame:c.zf,sound_volume:c.Af,sound_set_volume:c.wf},rive_path_v1:(null===f||"rive_path_v1"===f)&&{"new":c.hk,update:(z,
x,r,y,v,C)=>{const L=n();let S=0,pa=0;try{S=g(x,r),pa=g(y,4*v),c.kk(z,S,r,pa,v,C)}finally{l(pa,4*v),l(S,r),p(L)}},release:c.jk,add:c.fk,verbs:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.lk(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},points:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.ik(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},effect_result:(z,x,r,y)=>{const v=n();let C=0,L=0;try{C=g(z,x),L=g(r,4*y),c.gk(C,x,L,y)}finally{l(L,4*y),l(C,x),p(v)}}},rive_measure_v1:(null===
f||"rive_measure_v1"===f)&&{path_new:(z,x,r,y)=>{const v=n();let C=0,L=0;try{return C=g(z,x),L=g(r,4*y),c.Ej(C,x,L,y)}finally{l(L,4*y),l(C,x),p(v)}},contours_new:(z,x,r,y)=>{const v=n();let C=0,L=0;try{return C=g(z,x),L=g(r,4*y),c.zj(C,x,L,y)}finally{l(L,4*y),l(C,x),p(v)}},contour_next:c.yj,length:c.Dj,is_closed:c.Cj,pos_tan:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,4*y),c.Fj(z,x,C,y),w(C,r,4*y)}finally{l(C,4*y),p(v)}},warp:(z,x,r,y,v)=>{const C=n();let L=0;try{L=g(y,4*v),c.Hj(z,x,r,L,v),w(L,y,4*
v)}finally{l(L,4*v),p(C)}},extract:c.Aj,extract_read:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{L=g(x,r);S=g(y,4*v);const pa=c.Bj(z,L,r,S,v);w(L,x,r);w(S,y,4*v);return pa}finally{l(S,4*v),l(L,r),p(C)}},release:c.Gj},rive_paint_v1:(null===f||"rive_paint_v1"===f)&&{"new":c.Yj,release:c.Zj,style:c.bk,color:c.Vj,thickness:c.ck,join:c.Xj,cap:c.Uj,blend_mode:c.Tj,feather:c.Wj,shader:c.$j,shader_transform:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.ak(z,v,r)}finally{l(v,4*r),p(y)}}},rive_canvas_v1:(null===
f||"rive_canvas_v1"===f)&&{"new":c.ag,release:c.bg,width:c.dg,height:c.Zf,resize:c.cg,image:c.$f,begin_frame:c.Xf,end_frame:c.Yf},rive_gpu_v1:(null===f||"rive_gpu_v1"===f)&&{features:(z,x)=>{const r=n();let y=0;try{y=g(z,4*x);const v=c.xi(y,x);w(y,z,4*x);return v}finally{l(y,4*x),p(r)}},canvas_new:c.ui,canvas_release:c.vi,canvas_color_view:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.si(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},canvas_image:c.ti,canvas_resize:(z,x,r,y,v)=>{const C=
n();let L=0;try{L=g(y,4*v);const S=c.wi(z,x,r,L,v);w(L,y,4*v);return S}finally{l(L,4*v),p(C)}},target_view:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.Wi(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},pass_begin:(z,x,r,y)=>{const v=n();let C=0,L=0;try{return C=g(z,x),L=g(r,y),c.zi(C,x,L,y)}finally{l(L,y),l(C,x),p(v)}},pass_set_pipeline:c.Hi,pass_set_vertex_buffer:c.Ki,pass_set_index_buffer:c.Gi,pass_set_bind_group:(z,x,r,y,v)=>{const C=n();let L=0;try{L=g(y,v),c.Ei(z,x,r,L,v)}finally{l(L,
v),p(C)}},pass_set_viewport:c.Li,pass_set_scissor:c.Ii,pass_set_stencil_reference:c.Ji,pass_set_blend_color:c.Fi,pass_draw:c.Ai,pass_draw_indexed:c.Bi,pass_finish:c.Ci,pass_release:c.Di,image_view:c.yi,buffer_new:(z,x,r,y,v)=>{const C=n();let L=0;try{return L=g(y,v),c.mi(z,x,r,L,v)}finally{l(L,v),p(C)}},buffer_update:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,y),c.pi(z,x,C,y)}finally{l(C,y),p(v)}},buffer_update_blob:c.ri,buffer_new_blob:c.ni,buffer_release:c.oi,texture_new:(z,x)=>{const r=n();let y=
0;try{return y=g(z,x),c.Xi(y,x)}finally{l(y,x),p(r)}},texture_upload:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{L=g(x,r),S=g(y,v),c.Zi(z,L,r,S,v)}finally{l(S,v),l(L,r),p(C)}},texture_release:c.Yi,sampler_new:(z,x)=>{const r=n();let y=0;try{return y=g(z,x),c.Oi(y,x)}finally{l(y,x),p(r)}},sampler_release:c.Pi,texture_view_new:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.$i(z,v,r)}finally{l(v,r),p(y)}},texture_view_release:c.aj,shader_target:c.Vi,shader_asset_bytes:(z,x,r,y,v)=>{const C=n();let L=
0,S=0;try{L=g(x,r);S=g(y,v);const pa=c.Qi(z,L,r,S,v);w(S,y,v);return pa}finally{l(S,v),l(L,r),p(C)}},shader_asset_id:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Ri(z,v,r)}finally{l(v,r),p(y)}},shader_module_from_asset:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(x,r),c.Si(z,C,r,y)}finally{l(C,r),p(v)}},shader_module_from_rstb:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(z,x),c.Ti(C,x,r,y)}finally{l(C,x),p(v)}},shader_module_release:c.Ui,bind_group_layout_new:(z,x,r)=>{const y=n();let v=
0;try{return v=g(x,r),c.hi(z,v,r)}finally{l(v,r),p(y)}},bind_group_layout_release:c.ii,bind_group_layout_from_shader:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(r,4*y),c.fi(z,x,C,y)}finally{l(C,4*y),p(v)}},bind_group_layout_from_shaders:(z,x,r,y,v)=>{const C=n();let L=0;try{return L=g(y,4*v),c.gi(z,x,r,L,v)}finally{l(L,4*v),p(C)}},bind_group_layout_from_entries:(z,x,r,y,v,C,L)=>{const S=n();let pa=0,xa=0;try{return pa=g(x,r),xa=g(v,C),c.ei(z,pa,r,y,xa,C,L)}finally{l(xa,C),l(pa,r),p(S)}},bind_group_new:(z,
x,r,y,v,C,L)=>{const S=n();let pa=0,xa=0,Ja=0;try{return pa=g(x,r),xa=g(y,v),Ja=g(C,L),c.ki(z,pa,r,xa,v,Ja,L)}finally{l(Ja,L),l(xa,v),l(pa,r),p(S)}},bind_group_release:c.li,pipeline_new:(z,x,r,y)=>{const v=n();let C=0,L=0;try{return C=g(z,x),L=g(r,y),c.Mi(C,x,L,y)}finally{l(L,y),l(C,x),p(v)}},pipeline_release:c.Ni},rive_mat4_v1:(null===f||"rive_mat4_v1"===f)&&{multiply:(z,x,r,y,v,C)=>{const L=n();let S=0,pa=0,xa=0;try{S=g(z,x),pa=g(r,y),xa=g(v,C),c.xj(S,x,pa,y,xa,C),w(S,z,x)}finally{l(xa,C),l(pa,
y),l(S,x),p(L)}},invert:(z,x,r,y)=>{const v=n();let C=0,L=0;try{C=g(z,x);L=g(r,y);const S=c.wj(C,x,L,y);w(C,z,x);return S}finally{l(L,y),l(C,x),p(v)}}},rive_buffer_v1:(null===f||"rive_buffer_v1"===f)&&{"new":c.Uf,update:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.Wf(z,v,r)}finally{l(v,r),p(y)}},release:c.Vf},rive_mesh_instances_v1:(null===f||"rive_mesh_instances_v1"===f)&&{"new":c.Ij,resize:c.Kj,update:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,y),c.Lj(z,x,C,y)}finally{l(C,y),p(v)}},release:c.Jj},
rive_blob_v1:(null===f||"rive_blob_v1"===f)&&{asset_bytes:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{L=g(x,r);S=g(y,v);const pa=c.Sf(z,L,r,S,v);w(S,y,v);return pa}finally{l(S,v),l(L,r),p(C)}},asset_read:(z,x,r,y,v,C)=>{const L=n();let S=0,pa=0;try{S=g(x,r);pa=e(v,C);const xa=c.Tf(z,S,r,y,pa,C);w(pa,v,xa>>>0<=C?xa>>>0:0);return xa}finally{l(pa,C),l(S,r),p(L)}}},rive_image_v1:(null===f||"rive_image_v1"===f)&&{from_asset:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.dj(z,v,r)}finally{l(v,r),p(y)}},
width:c.ij,height:c.fj,release:c.hj,decode:(z,x,r)=>{const y=n();let v=0;try{return v=g(z,x),c.bj(v,x,r)}finally{l(v,x),p(y)}},decode_cancel:c.cj,load:(z,x)=>{const r=n();let y=0;try{return y=g(z,x),c.gj(y,x)}finally{l(y,x),p(r)}},from_pixels:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(r,y),c.ej(z,x,C,y)}finally{l(C,y),p(v)}}},rive_font_v1:(null===f||"rive_font_v1"===f)&&{from_asset:(z,x,r)=>{const y=n();let v=0;try{return v=g(x,r),c.Wh(z,v,r)}finally{l(v,r),p(y)}},decode:(z,x)=>{const r=n();let y=
0;try{return y=g(z,x),c.Uh(y,x)}finally{l(y,x),p(r)}},release:c.bi,metrics:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.ai(z,v,r),w(v,x,4*r)}finally{l(v,4*r),p(y)}},weight:c.ci,is_italic:c.$h,axis_count:c.Sh,axis:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,4*y),c.Rh(z,x,C,y),w(C,r,4*y)}finally{l(C,4*y),p(v)}},axis_value:c.Th,features:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.Vh(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},has_glyph:c.Zh,with_options:(z,x,r,y,v)=>{const C=n();let L=
0,S=0;try{return L=g(x,4*r),S=g(y,4*v),c.di(z,L,r,S,v)}finally{l(S,4*v),l(L,4*r),p(C)}},glyph_verbs:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,y);const L=c.Yh(z,x,C,y);w(C,r,y);return L}finally{l(C,y),p(v)}},glyph_points:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,4*y);const L=c.Xh(z,x,C,y);w(C,r,4*y);return L}finally{l(C,4*y),p(v)}}},rive_text_v1:(null===f||"rive_text_v1"===f)&&{"new":c.zl,release:c.Al,append:(z,x,r,y,v,C,L,S,pa)=>{const xa=n();let Ja=0;try{Ja=g(x,r),c.pl(z,Ja,r,y,v,C,L,S,pa)}finally{l(Ja,
r),p(xa)}},clear:c.sl,layout:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r),c.wl(z,v,r)}finally{l(v,r),p(y)}},draw:c.tl,bounds:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r),c.ql(z,v,r),w(v,x,4*r)}finally{l(v,4*r),p(y)}},length:c.xl,lines:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.yl(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},runs:(z,x,r)=>{const y=n();let v=0;try{v=g(x,4*r);const C=c.Bl(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},glyphs:(z,x,r)=>{const y=n();let v=0;try{v=g(x,
4*r);const C=c.ul(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},hit_test:c.vl,caret:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,4*y);const L=c.rl(z,x,C,y);w(C,r,4*y);return L}finally{l(C,4*y),p(v)}},selection_rects:(z,x,r,y,v)=>{const C=n();let L=0;try{L=g(y,4*v);const S=c.Cl(z,x,r,L,v);w(L,y,4*v);return S}finally{l(L,4*v),p(C)}}},rive_shader_v1:(null===f||"rive_shader_v1"===f)&&{linear:c.Ik,radial:c.Jk,release:c.Kk},rive_test_v1:(null===f||"rive_test_v1"===f)&&{blob:(z,x,r,y)=>{const v=n();let C=
0,L=0;try{C=g(z,x);L=g(r,y);const S=c.ol(C,x,L,y);w(L,r,y);return S}finally{l(L,y),l(C,x),p(v)}}},rive_transition_v1:(null===f||"rive_transition_v1"===f)&&{child_draw:c.El,child_width:c.Gl,child_height:c.Fl},rive_renderer_v1:(null===f||"rive_renderer_v1"===f)&&{save:c.vk,restore:c.uk,transform:c.wk,draw_path:c.rk,clip_path:c.mk,modulate_opacity:c.tk,modulate_color:c.sk,draw_image:c.nk,draw_image_mesh:c.pk,draw_image_mesh_instanced:c.qk},rive_net_v1:(null===f||"rive_net_v1"===f)&&{fetch:(z,x,r)=>{const y=
n();let v=0;try{return v=g(z,x),c.Rj(v,x,r)}finally{l(v,x),p(y)}},fetch_cancel:c.Sj,body_read:c.Oj,body_take:(z,x,r)=>{const y=n();let v=0;try{v=e(x,r);const C=c.Pj(z,v,r);w(v,x,C>>>0<=r?C>>>0:0);return C}finally{l(v,r),p(y)}},body_blob:c.Mj,body_unwait:c.Qj,body_cancel:c.Nj},rive_file_v1:(null===f||"rive_file_v1"===f)&&{decode:(z,x,r,y)=>{const v=n();let C=0,L=0;try{C=g(z,x);L=g(r,4*y);const S=c.Nh(C,x,L,y);w(L,r,4*y);return S}finally{l(L,4*y),l(C,x),p(v)}},decode_blob:(z,x,r)=>{const y=n();let v=
0;try{v=g(x,4*r);const C=c.Oh(z,v,r);w(v,x,4*r);return C}finally{l(v,4*r),p(y)}},release:c.Qh,artboard_count:c.Fh,artboard_name:(z,x,r,y)=>{const v=n();let C=0;try{C=g(r,y);const L=c.Gh(z,x,C,y);w(C,r,y);return L}finally{l(C,y),p(v)}},bindable:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(x,r),c.Hh(z,C,r,y)}finally{l(C,r),p(v)}},bindable_release:c.Mh,bindable_name:(z,x,r)=>{const y=n();let v=0;try{v=g(x,r);const C=c.Lh(z,v,r);w(v,x,r);return C}finally{l(v,r),p(y)}},bindable_data:c.Ih,host_bindable:(z,
x,r,y)=>{const v=n();let C=0;try{return C=g(x,r),c.Ph(z,C,r,y)}finally{l(C,r),p(v)}},bindable_equal:c.Jh,bindable_identity:c.Kh,artboard:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(x,r),c.Eh(z,C,r,y)}finally{l(C,r),p(v)}}},rive_lanes_v1:(null===f||"rive_lanes_v1"===f)&&{start:(z,x,r,y,v,C)=>{const L=n();let S=0,pa=0;try{return S=g(r,y),pa=g(v,4*C),c.qj(z,x,S,y,pa,C)}finally{l(pa,4*C),l(S,y),p(L)}},state:c.rj,failed:(z,x,r)=>{const y=n();let v=0;try{v=e(x,r);const C=c.nj(z,v,r);w(v,x,C>>>0<=r?C>>>
0:0);return C}finally{l(v,r),p(y)}},stop:c.sj,release:c.oj,result:c.pj,watch:c.vj,wait:c.tj,cancel_wait:c.mj,wait_within:c.uj},rive_jobs_v1:(null===f||"rive_jobs_v1"===f)&&{threads:c.lj,join:c.jj,join_any:(z,x,r)=>{const y=n();let v=0;try{return v=g(z,4*x),c.kj(v,x,r)}finally{l(v,4*x),p(y)}}},rive_parallel_v1:(null===f||"rive_parallel_v1"===f)&&{size:c.ek,run:c.dk,waiting:()=>{}},rive_shared_v1:(null===f||"rive_shared_v1"===f)&&{region_create:c.Tk,region_size:c.Xk,region_lock:c.Uk,region_unlock:c.Yk,
region_read:(z,x,r,y)=>{const v=n();let C=0;try{C=e(r,y);const L=c.Wk(z,x,C,y);w(C,r,0!==L?y:0);return L}finally{l(C,y),p(v)}},region_write:(z,x,r,y)=>{const v=n();let C=0;try{return C=g(r,y),c.Zk(z,x,C,y)}finally{l(C,y),p(v)}},region_poisoned:c.Vk,atomic_load:c.Nk,atomic_store:c.Ok,atomic_add:c.Lk,atomic_cas:c.Mk,ring_create:c.bl,ring_write:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{return L=g(x,r),S=g(y,4*v),c.gl(z,L,r,S,v)}finally{l(S,4*v),l(L,r),p(C)}},ring_read:(z,x,r)=>{const y=n();let v=0;try{v=
e(x,r);const C=c.dl(z,v,r);z=C-1;w(v,x,z>>>0<=r?z>>>0:0);return C}finally{l(v,r),p(y)}},ring_drop:c.cl,ring_used:c.fl,ring_signal:c.el,snapshot_create:c.kl,snapshot_publish:(z,x,r,y,v)=>{const C=n();let L=0,S=0;try{return L=g(x,r),S=g(y,4*v),c.ll(z,L,r,S,v)}finally{l(S,4*v),l(L,r),p(C)}},snapshot_read:(z,x,r)=>{const y=n();let v=0;try{v=e(x,r);const C=c.ml(z,v,r);z=C-1;w(v,x,z>>>0<=r?z>>>0:0);return C}finally{l(v,r),p(y)}},snapshot_seq:c.nl,read_done:c.Sk,signal_create:c.hl,signal_notify:c.il,signal_seq:c.jl,
blob_create:(z,x)=>{const r=n();let y=0;try{return y=g(z,x),c.Pk(y,x)}finally{l(y,x),p(r)}},blob_size:c.Rk,blob_read:(z,x,r,y)=>{const v=n();let C=0;try{C=e(r,y);const L=c.Qk(z,x,C,y);w(C,r,L>>>0<=y?L>>>0:0);return L}finally{l(C,y),p(v)}},retain:c.al,release:c.$k}}}function h(q,a,f=null){const c=a.Va??{i:!1},n=()=>{const k=Error(a.j);a.j=null;throw k;},p=()=>{throw Error("librive faulted in a nested script call");},t=()=>{throw Error("script VM was released");};return{Ek:(null===f||"rive_rt_v1"===
f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(0)),Fk:(null===f||"rive_rt_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(1)),yk:(null===f||"rive_rt_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(2)),Ck:(null===f||"rive_rt_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(3)),zk:(null===f||"rive_rt_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(4)),Bk:(null===f||"rive_rt_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(5)),Ak:(null===f||"rive_rt_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{k(a.g)}catch(e){var b=e;a.h=!0;throw b;}a.h&&p();null!==a.j&&n()})(q(6)),Gk:(null===
f||"rive_rt_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(7)),Dk:(null===f||"rive_rt_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(8)),Hk:(null===f||"rive_rt_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(9)),xk:(null===f||"rive_rt_v1"===f)&&
(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(10)),ih:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(11)),bh:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(12)),Gg:(null===f||"rive_data_v1"===f)&&(k=>(b,
e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(13)),Hg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(14)),tg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(15)),wg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===
a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(16)),yg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(17)),xg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(18)),ug:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,
b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(19)),vg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(20)),Ig:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(21)),Wg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,
l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(22)),yh:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(23)),wh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(24)),nh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(25)),zh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(26)),Bh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(27)),oh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(28)),Ch:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(29)),xh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(30)),uh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(31)),Ah:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(32)),qh:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(33)),sh:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&
p();null!==a.j&&n();return e})(q(34)),jh:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(35)),vh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(36)),ph:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();
null!==a.j&&n();return l})(q(37)),th:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(38)),rh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(39)),mh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&
p();null!==a.j&&n();return l})(q(40)),lh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(41)),Jg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(42)),Kg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&
n()})(q(43)),Dg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(44)),Fg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(45)),Eg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(46)),lg:(null===f||"rive_data_v1"===f)&&(k=>
b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(47)),jg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(48)),mg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(49)),kg:(null===f||"rive_data_v1"===f)&&(k=>
(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(50)),og:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(51)),ig:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(52)),ng:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,
b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(53)),hg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(54)),fg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(55)),gg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&
p();null!==a.j&&n()})(q(56)),Ag:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(57)),Bg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(58)),Cg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();
return l})(q(59)),ah:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(60)),Zg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(61)),$g:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(62)),gh:(null===f||
"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(63)),Og:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(64)),Qg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(65)),Pg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;
let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(66)),Ug:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(67)),Lg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(68)),Vg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=
l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(69)),Ng:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(70)),Rg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(71)),Tg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(72)),Sg:(null===
f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(73)),Mg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(74)),kh:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(75)),rg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&
t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(76)),sg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(77)),Xg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(78)),Yg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(79)),pg:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(80)),qg:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(81)),eh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&
n();return l})(q(82)),dh:(null===f||"rive_data_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(83)),fh:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(84)),Dh:(null===f||"rive_data_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(85)),hh:(null===f||"rive_data_v1"===
f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(86)),zg:(null===f||"rive_data_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(87)),Ze:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(88)),ke:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;
try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(89)),se:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(90)),Ee:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(91)),re:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,
b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(92)),ef:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(93)),Be:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(94)),cf:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(95)),bf:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(96)),ze:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(97)),af:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&
n()})(q(98)),qe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(99)),Xe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(100)),$e:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l,w,I,O,z,x)=>{0===a.g&&t();c.i&&c.l++;let r;try{r=k(a.g,b,e,g,l,w,I,O,z,x)}catch(y){throw b=y,a.h=
!0,b;}a.h&&p();null!==a.j&&n();return r})(q(101)),Ae:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(102)),Fe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(103)),df:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,
b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(104)),le:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(105)),oe:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(106)),ne:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(107)),me:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(108)),pe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(109)),je:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l,w,I,O,z)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O,z)}catch(x){throw b=
x,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(110)),Ge:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(111)),Se:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(112)),Ve:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();
null!==a.j&&n()})(q(113)),Te:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(114)),We:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(115)),Ue:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(116)),
Je:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(117)),Qe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(118)),Pe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(119)),
Ne:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(120)),Ie:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(121)),Oe:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(122)),
Ye:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(123)),ue:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(124)),te:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(125)),ve:(null===f||
"rive_artboard_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(126)),ye:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(127)),xe:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(128)),we:(null===
f||"rive_artboard_v1"===f)&&(k=>void 0===k?m("rive_artboard_v1","drawable_properties"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(129)),Re:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(130)),Le:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(131)),Ce:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(132)),De:(null===f||"rive_artboard_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(133)),Me:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(134)),Ke:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(135)),He:(null===f||"rive_artboard_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(136)),Bf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(137)),Ef:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(138)),Df:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(139)),Ff:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&
n();return e})(q(140)),Cf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(141)),Gf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(142)),Hf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();
null!==a.j&&n();return I})(q(143)),Lf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(144)),Of:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(145)),If:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();
return e})(q(146)),Mf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(147)),Nf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(148)),Pf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(149)),Jf:(null===
f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(150)),Kf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(151)),ff:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(152)),hf:(null===f||"rive_audio_v1"===f)&&(k=>(b,
e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(153)),kf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(154)),gf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(155)),jf:(null===f||"rive_audio_v1"===f)&&(k=>
(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(156)),Qf:(null===f||"rive_audio_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(157)),Rf:(null===f||"rive_audio_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(158)),nf:(null===f||"rive_audio_v1"===f)&&(k=>()=>{0===a.g&&t();
c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(159)),mf:(null===f||"rive_audio_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(160)),lf:(null===f||"rive_audio_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(161)),sf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=
e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(162)),rf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(163)),qf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(164)),tf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(165)),xf:(null===f||"rive_audio_v1"===
f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(166)),uf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(167)),vf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(168)),pf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===
a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(169)),yf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(170)),zf:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(171)),Af:(null===f||"rive_audio_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;
let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(172)),wf:(null===f||"rive_audio_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(173)),hk:(null===f||"rive_path_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(174)),kk:(null===f||"rive_path_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,
I)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(175)),jk:(null===f||"rive_path_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(176)),fk:(null===f||"rive_path_v1"===f)&&(k=>(b,e,g,l,w,I,O,z)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O,z)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(177)),lk:(null===f||"rive_path_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,
a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(178)),ik:(null===f||"rive_path_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(179)),gk:(null===f||"rive_path_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(180)),Ej:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=
I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(181)),zj:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(182)),yj:(null===f||"rive_measure_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(183)),Dj:(null===f||"rive_measure_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(184)),Cj:(null===f||"rive_measure_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(185)),Fj:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(186)),Hj:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,
a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(187)),Aj:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(188)),Bj:(null===f||"rive_measure_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(189)),Gj:(null===f||"rive_measure_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=
e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(190)),Yj:(null===f||"rive_paint_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(191)),Zj:(null===f||"rive_paint_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(192)),bk:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(193)),
Vj:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(194)),ck:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(195)),Xj:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(196)),Uj:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===
a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(197)),Tj:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(198)),Wj:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(199)),$j:(null===f||"rive_paint_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=
g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(200)),ak:(null===f||"rive_paint_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(201)),ag:(null===f||"rive_canvas_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(202)),bg:(null===f||"rive_canvas_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&
n()})(q(203)),dg:(null===f||"rive_canvas_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(204)),Zf:(null===f||"rive_canvas_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(205)),cg:(null===f||"rive_canvas_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(206)),
$f:(null===f||"rive_canvas_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(207)),Xf:(null===f||"rive_canvas_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(208)),Yf:(null===f||"rive_canvas_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(209)),xi:(null===f||"rive_gpu_v1"===
f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(210)),ui:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(211)),vi:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(212)),si:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&
t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(213)),ti:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(214)),wi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(215)),Wi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===
a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(216)),zi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(217)),Hi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(218)),Ki:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();
c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(219)),Gi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(220)),Ei:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(221)),Li:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,
b,e,g,l,w,I,O)}catch(z){throw b=z,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(222)),Ii:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(223)),Ji:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(224)),Fi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=
I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(225)),Ai:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(226)),Bi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(227)),Ci:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&
n()})(q(228)),Di:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(229)),yi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(230)),mi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(231)),
pi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(232)),ri:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(233)),ni:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(234)),oi:(null===
f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(235)),Xi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(236)),Zi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(237)),Yi:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===
a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(238)),Oi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(239)),Pi:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(240)),$i:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=
w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(241)),aj:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(242)),Vi:(null===f||"rive_gpu_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(243)),Qi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==
a.j&&n();return I})(q(244)),Ri:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(245)),Si:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(246)),Ti:(null===f||"rive_gpu_v1"===f)&&(k=>void 0===k?m("rive_gpu_v1","shader_module_from_rstb"):(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;
try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(247)),Ui:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(248)),hi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(249)),ii:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=
e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(250)),fi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(251)),gi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(252)),ei:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;let z;try{z=k(a.g,b,e,
g,l,w,I,O)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n();return z})(q(253)),ki:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;let z;try{z=k(a.g,b,e,g,l,w,I,O)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n();return z})(q(254)),li:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(255)),Mi:(null===f||"rive_gpu_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,
b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(256)),Ni:(null===f||"rive_gpu_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(257)),xj:(null===f||"rive_mat4_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(258)),wj:(null===f||"rive_mat4_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=
I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(259)),Uf:(null===f||"rive_buffer_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(260)),Wf:(null===f||"rive_buffer_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(261)),Vf:(null===f||"rive_buffer_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&
p();null!==a.j&&n()})(q(262)),Ij:(null===f||"rive_mesh_instances_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(263)),Kj:(null===f||"rive_mesh_instances_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(264)),Lj:(null===f||"rive_mesh_instances_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();
null!==a.j&&n()})(q(265)),Jj:(null===f||"rive_mesh_instances_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(266)),Sf:(null===f||"rive_blob_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(267)),Tf:(null===f||"rive_blob_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;let O;try{O=k(a.g,b,e,g,l,w,I)}catch(z){throw b=z,a.h=!0,b;}a.h&&
p();null!==a.j&&n();return O})(q(268)),dj:(null===f||"rive_image_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(269)),ij:(null===f||"rive_image_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(270)),fj:(null===f||"rive_image_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==
a.j&&n();return e})(q(271)),hj:(null===f||"rive_image_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(272)),bj:(null===f||"rive_image_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(273)),cj:(null===f||"rive_image_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(274)),gj:(null===
f||"rive_image_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(275)),ej:(null===f||"rive_image_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(276)),Wh:(null===f||"rive_font_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(277)),
Uh:(null===f||"rive_font_v1"===f)&&(k=>void 0===k?m("rive_font_v1","decode"):(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(278)),bi:(null===f||"rive_font_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(279)),ai:(null===f||"rive_font_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(280)),
ci:(null===f||"rive_font_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(281)),$h:(null===f||"rive_font_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(282)),Sh:(null===f||"rive_font_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(283)),Rh:(null===f||"rive_font_v1"===
f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(284)),Th:(null===f||"rive_font_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(285)),Vh:(null===f||"rive_font_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(286)),Zh:(null===f||"rive_font_v1"===f)&&(k=>
(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(287)),di:(null===f||"rive_font_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(288)),Yh:(null===f||"rive_font_v1"===f)&&(k=>void 0===k?m("rive_font_v1","glyph_verbs"):(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&
n();return w})(q(289)),Xh:(null===f||"rive_font_v1"===f)&&(k=>void 0===k?m("rive_font_v1","glyph_points"):(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(290)),zl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","new"):()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(291)),Al:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1",
"release"):b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(292)),pl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","append"):(b,e,g,l,w,I,O,z,x)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O,z,x)}catch(r){throw b=r,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(293)),sl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","clear"):b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(294)),
wl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","layout"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(295)),tl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","draw"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(296)),ql:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","bounds"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,
b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(297)),xl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","length"):b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(298)),yl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","lines"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(299)),Bl:(null===f||"rive_text_v1"===
f)&&(k=>void 0===k?m("rive_text_v1","runs"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(300)),ul:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","glyphs"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(301)),vl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","hit_test"):(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;
try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(302)),rl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","caret"):(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(303)),Cl:(null===f||"rive_text_v1"===f)&&(k=>void 0===k?m("rive_text_v1","selection_rects"):(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==
a.j&&n();return I})(q(304)),Ik:(null===f||"rive_shader_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;let z;try{z=k(a.g,b,e,g,l,w,I,O)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n();return z})(q(305)),Jk:(null===f||"rive_shader_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;let O;try{O=k(a.g,b,e,g,l,w,I)}catch(z){throw b=z,a.h=!0,b;}a.h&&p();null!==a.j&&n();return O})(q(306)),Kk:(null===f||"rive_shader_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=
e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(307)),ol:(null===f||"rive_test_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(308)),El:(null===f||"rive_transition_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(309)),Gl:(null===f||"rive_transition_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&
p();null!==a.j&&n();return e})(q(310)),Fl:(null===f||"rive_transition_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(311)),vk:(null===f||"rive_renderer_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(312)),uk:(null===f||"rive_renderer_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(313)),
wk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O)}catch(z){throw b=z,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(314)),rk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(315)),mk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(316)),tk:(null===f||"rive_renderer_v1"===
f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(317)),sk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(318)),nk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(319)),pk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g,l,w,I,O,
z)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O,z)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(320)),qk:(null===f||"rive_renderer_v1"===f)&&(k=>(b,e,g,l,w,I,O)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O)}catch(z){throw b=z,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(321)),Rj:(null===f||"rive_net_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(322)),Sj:(null===f||"rive_net_v1"===f)&&(k=>
b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(323)),Oj:(null===f||"rive_net_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(324)),Pj:(null===f||"rive_net_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(325)),Mj:(null===f||"rive_net_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;
let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(326)),Qj:(null===f||"rive_net_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(327)),Nj:(null===f||"rive_net_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(328)),Nh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,
a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(329)),Oh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(330)),Qh:(null===f||"rive_file_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(331)),Fh:(null===f||"rive_file_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==
a.j&&n();return e})(q(332)),Gh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(333)),Hh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(334)),Mh:(null===f||"rive_file_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==
a.j&&n()})(q(335)),Lh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(336)),Ih:(null===f||"rive_file_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(337)),Ph:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&
n();return w})(q(338)),Jh:(null===f||"rive_file_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(339)),Kh:(null===f||"rive_file_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(340)),Eh:(null===f||"rive_file_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&
n();return w})(q(341)),qj:(null===f||"rive_lanes_v1"===f)&&(k=>(b,e,g,l,w,I)=>{0===a.g&&t();c.i&&c.l++;let O;try{O=k(a.g,b,e,g,l,w,I)}catch(z){throw b=z,a.h=!0,b;}a.h&&p();null!==a.j&&n();return O})(q(342)),rj:(null===f||"rive_lanes_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(343)),nj:(null===f||"rive_lanes_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&
p();null!==a.j&&n();return l})(q(344)),sj:(null===f||"rive_lanes_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(345)),oj:(null===f||"rive_lanes_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(346)),pj:(null===f||"rive_lanes_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(347)),
vj:(null===f||"rive_lanes_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(348)),tj:(null===f||"rive_lanes_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(349)),mj:(null===f||"rive_lanes_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(350)),uj:(null===f||"rive_lanes_v1"===
f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(351)),lj:(null===f||"rive_jobs_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(352)),jj:(null===f||"rive_jobs_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(353)),kj:(null===f||"rive_jobs_v1"===f)&&(k=>
(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(354)),ek:(null===f||"rive_parallel_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(355)),dk:(null===f||"rive_parallel_v1"===f)&&(k=>void 0===k?m("rive_parallel_v1","run"):b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(356)),Tk:(null===
f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(357)),Xk:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(358)),Uk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(359)),Yk:(null===f||"rive_shared_v1"===
f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(360)),Wk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(361)),Zk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(362)),Vk:(null===f||"rive_shared_v1"===f)&&
(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(363)),Nk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(364)),Ok:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(365)),Lk:(null===f||"rive_shared_v1"===
f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(366)),Mk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(367)),bl:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(368)),gl:(null===f||"rive_shared_v1"===
f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(369)),dl:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(370)),cl:(null===f||"rive_shared_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(371)),fl:(null===
f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(372)),el:(null===f||"rive_shared_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(373)),kl:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(374)),ll:(null===f||"rive_shared_v1"===
f)&&(k=>(b,e,g,l,w)=>{0===a.g&&t();c.i&&c.l++;let I;try{I=k(a.g,b,e,g,l,w)}catch(O){throw b=O,a.h=!0,b;}a.h&&p();null!==a.j&&n();return I})(q(375)),ml:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;let l;try{l=k(a.g,b,e,g)}catch(w){throw b=w,a.h=!0,b;}a.h&&p();null!==a.j&&n();return l})(q(376)),nl:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(377)),Sk:(null===f||"rive_shared_v1"===
f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{k(a.g)}catch(e){var b=e;a.h=!0;throw b;}a.h&&p();null!==a.j&&n()})(q(378)),hl:(null===f||"rive_shared_v1"===f)&&(k=>()=>{0===a.g&&t();c.i&&c.l++;try{var b=k(a.g)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n();return b})(q(379)),il:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(380)),jl:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=
k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(381)),Pk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e)=>{0===a.g&&t();c.i&&c.l++;let g;try{g=k(a.g,b,e)}catch(l){throw b=l,a.h=!0,b;}a.h&&p();null!==a.j&&n();return g})(q(382)),Rk:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(383)),Qk:(null===f||"rive_shared_v1"===f)&&(k=>(b,e,g,l)=>{0===a.g&&t();c.i&&c.l++;let w;try{w=
k(a.g,b,e,g,l)}catch(I){throw b=I,a.h=!0,b;}a.h&&p();null!==a.j&&n();return w})(q(384)),al:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;let e;try{e=k(a.g,b)}catch(g){throw b=g,a.h=!0,b;}a.h&&p();null!==a.j&&n();return e})(q(385)),$k:(null===f||"rive_shared_v1"===f)&&(k=>b=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b)}catch(e){throw b=e,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(386)),eg:(null===f||"env"===f)&&(k=>(b,e,g)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g)}catch(l){throw b=l,a.h=
!0,b;}a.h&&p();null!==a.j&&n()})(q(387)),Dl:(null===f||"env"===f)&&(k=>(b,e,g,l,w,I,O,z)=>{0===a.g&&t();c.i&&c.l++;try{k(a.g,b,e,g,l,w,I,O,z)}catch(x){throw b=x,a.h=!0,b;}a.h&&p();null!==a.j&&n()})(q(388))}}function m(q,a){return()=>{throw Error("failed to call unlinked import function "+q+"."+a);}}function u(q,a,f){if(a+f>q.byteLength)throw Error("out of bounds memory access");}function A(q,a){a>>>=0;if(4>a)return 0;u(q,a,0);const f=(new DataView(q)).getUint32(a-4,!0);u(q,a,f);return f}function D(q,
a,f){a>>>=0;f>>>=0;u(q,a,f);if("undefined"!==typeof TextDecoder)return(new TextDecoder("utf-16le",{ignoreBOM:!0})).decode(new Uint8Array(q,a,f));q=0===a%2?new Uint16Array(q,a,f>>1):new Uint16Array(q.slice(a,a+f-f%2));a="";for(f=0;f<q.length;f+=4096)a+=String.fromCharCode.apply(null,q.subarray(f,f+4096));return a}function G(q,a){let f=H.get(a);if(void 0===f){for(let c=0;32>c&&void 0===f;c++){const n=a+16+4*c>>>2;0===Atomics.compareExchange(q,n,0,1)&&(f={ua:n,Sb:2+c})}f??={ua:-1,Sb:34+Atomics.add(q,
a+144>>>2,1)};H.set(a,f)}return f}function E(q,a,f,c,n=null,p=()=>{}){a>>>=0;const t=f%4294967296,k=Math.floor(f/4294967296);let b=null,e=null,g=null,l=null,w=null,I=null;const O=()=>{const N=q();N!==b&&(b=N,e=new Uint8Array(b),g=new Int32Array(b),l=new Uint32Array(b))};O();const z=G(g,a);null!==n&&Atomics.store(n,2,z.Sb);const x=(N,ha)=>{const fa=c().buffer;fa!==w&&(w=fa,I=new Uint8Array(fa));return N+ha<=I.length?I:null},r=(N,ha,fa,ja,sa)=>{for(let qa=0;qa<sa;qa++)N[ha+qa]=fa[ja+qa]},y=N=>{for(null!==
n&&Atomics.store(n,3,N);0!==Atomics.compareExchange(g,N>>>2,0,z.Sb););},v=N=>{Atomics.store(g,N>>>2,0);null!==n&&Atomics.store(n,3,0)};let C=0;const L=(N,ha)=>{O();N>>>=0;if(0===(N&2147483648))return 0;var fa=(N&2147483647)>>>12,ja=Atomics.load(l,a+148+4*(fa>>>10)>>>2);if(0===ja)return 0;fa=ja+24*(fa&1023);ja=fa>>>2;if(0<=z.ua){if(Atomics.store(l,z.ua,fa),ja=Atomics.load(l,ja),0===(ja&4096)||0!==((ja^N)&4095))return Atomics.store(l,z.ua,1),0}else for(;;){const sa=Atomics.load(l,ja);if(0===(sa&4096)||
0!==((sa^N)&4095))return 0;if(Atomics.compareExchange(l,ja,sa,sa+8192)===sa)break}C=fa;N=Atomics.load(l,fa+4>>>2);return l[N>>>2]!==ha||l[fa+16>>>2]!==t||l[fa+20>>>2]!==k?(S(),0):N},S=()=>{0<=z.ua?Atomics.store(l,z.ua,1):Atomics.sub(l,C+0>>>2,8192)},pa=N=>{N=L(N,3);if(0!==N){4294967295===Atomics.add(l,N+24>>>2,1)&&Atomics.add(l,N+28>>>2,1);y(N+4);try{const ha=l[N+16>>>2],fa=l[N+32>>>2]>>>2;for(let ja=0;ja<ha;ja++){const sa=l[fa+ja]+0>>>2;Atomics.add(g,sa,1);Atomics.notify(g,sa)}}finally{v(N+4),S()}}},
xa=(N,ha,fa,ja,sa)=>{const qa=Math.min(sa,l[N+8>>>2]-ha);r(e,N+32+ha,fa,ja,qa);r(e,N+32,fa,ja+qa,sa-qa)},Ja=(N,ha,fa,ja,sa)=>{var qa=l[N+8>>>2];ha%=qa;qa=Math.min(sa,qa-ha);r(fa,ja,e,N+32+ha,qa);r(fa,ja+qa,e,N+32,sa-qa)},Gb=new Uint8Array(4),Hb=new Uint32Array(Gb.buffer),fb=()=>{p("a processor cannot pass shared objects through rings or snapshots, as the audio thread may not hold or give them back; pass them in Audio.start's argument");return 0},ac=(N,ha,fa,ja)=>{N=L(N,1);if(0===N)return 0;let sa=
0,qa=0;y(N+4);try{const Oa=l[N+20>>>2];if(0===Oa)return 0;const ia=l[N+16>>>2];Ja(N,ia,Gb,0,4);qa=Hb[0];if(0!==(qa&2147483648))return fb();if(null===ha){if(qa<=ja)return 0}else{if(0===fa||qa>ja)return qa+1;Ja(N,ia+4,ha,fa,qa)}l[N+16>>>2]=(ia+4+qa)%l[N+8>>>2];l[N+20>>>2]=Oa-4-qa;sa=l[N+28>>>2]}finally{v(N+4),S()}pa(sa);return qa+1},xb=(N,ha,fa)=>{N=L(N,0);if(0===N)return-1;try{ha>>>=0;var ja=0!==(ha&3)||ha+4>l[N+8>>>2]?-1:N+32+ha>>>2;return 0>ja?-1:fa(ja)>>>0}finally{S()}};return{region_create:()=>
0,region_size:N=>{N=L(N,0);if(0===N)return 0;N=l[N+8>>>2];S();return N},region_lock:()=>0,region_unlock:()=>{},region_read:()=>0,region_write:()=>0,region_poisoned:N=>{N=L(N,0);if(0===N)return 0;N=0!==l[N+16>>>2]?1:0;S();return N},atomic_load:(N,ha)=>xb(N,ha,fa=>Atomics.load(g,fa)),atomic_store:(N,ha,fa)=>xb(N,ha,ja=>{Atomics.store(g,ja,fa|0);return 0}),atomic_add:(N,ha,fa)=>xb(N,ha,ja=>Atomics.add(g,ja,fa|0)),atomic_cas:(N,ha,fa,ja)=>xb(N,ha,sa=>Atomics.compareExchange(g,sa,fa|0,ja|0)),ring_create:()=>
0,ring_write:(N,ha,fa,ja,sa)=>{ha>>>=0;fa>>>=0;ja=x(ha,fa);N=null!==ja?L(N,1):0;if(0===N)return 0;if(0!==sa)return S(),fb();sa=0;y(N+4);try{const qa=l[N+8>>>2];if(4+fa>qa)return 2;const Oa=l[N+20>>>2];if(Oa+4+fa>qa)return 0;const ia=l[N+16>>>2];Hb[0]=fa;xa(N,(ia+Oa)%qa,Gb,0,4);xa(N,(ia+Oa+4)%qa,ja,ha,fa);l[N+20>>>2]=Oa+4+fa;sa=l[N+24>>>2]}finally{v(N+4),S()}pa(sa);return 1},ring_read:(N,ha,fa)=>{ha>>>=0;fa>>>=0;const ja=x(ha,fa);return null!==ja?ac(N,ja,ha,fa):0},ring_drop:(N,ha)=>ac(N,null,0,ha>>>
0),ring_used:N=>{N=L(N,1);if(0===N)return 0;y(N+4);const ha=l[N+20>>>2];v(N+4);S();return ha},ring_signal:(N,ha)=>{N=L(N,1);if(0===N)return 0;ha=l[N+(0!==ha?28:24)>>>2];S();return ha},snapshot_create:()=>0,snapshot_publish:(N,ha,fa,ja,sa)=>{ha>>>=0;fa>>>=0;ja=x(ha,fa);N=null!==ja?L(N,2):0;if(0===N)return 0;try{const Oa=l[N+8>>>2];if(0!==sa)return fb();if(fa>Oa)return 0;y(N+4);try{sa=N+16>>>2;var qa=Atomics.load(l,sa);const ia=N+40>>>2;if(0!==((0!==qa?Atomics.load(l,ia+qa-1):0)&2147483648))return fb();
qa%=2;const Za=(N+32>>>2)+qa,Ma=Atomics.load(l,Za)|1;Atomics.store(l,Za,Ma);Atomics.load(l,Za);r(e,N+48+qa*Oa,ja,ha,fa);Atomics.store(l,ia+qa,fa);Atomics.store(l,Za,Ma+1);Atomics.store(l,sa,qa+1);4294967295===Atomics.add(l,N+24>>>2,1)&&Atomics.add(l,N+28>>>2,1)}finally{v(N+4)}return 1}finally{S()}},snapshot_read:(N,ha,fa)=>{ha>>>=0;fa>>>=0;const ja=x(ha,fa);N=null!==ja?L(N,2):0;if(0===N)return 0;try{for(;;){const qa=Atomics.load(l,N+16>>>2);if(0===qa)return 0;var sa=qa-1;const Oa=(N+32>>>2)+sa,ia=
Atomics.load(l,Oa);if(0!==(ia&1))continue;const Za=Atomics.load(l,(N+40>>>2)+sa),Ma=l[N+8>>>2];sa=N+48+sa*Ma;const Ga=0!==(Za&2147483648),qb=Math.min(Za,Ma);!Ga&&0!==ha&&qb<=fa&&r(ja,ha,e,sa,qb);if(Atomics.compareExchange(l,Oa,ia,ia)===ia)return Ga?fb():qb+1}}finally{S()}},snapshot_seq:N=>{N=L(N,2);if(0===N)return 0;N=4294967296*Atomics.load(l,N+28>>>2)+Atomics.load(l,N+24>>>2);S();return N},signal_create:()=>0,signal_notify:N=>pa(N),signal_seq:N=>{N=L(N,3);if(0===N)return 0;N=4294967296*Atomics.load(l,
N+28>>>2)+Atomics.load(l,N+24>>>2);S();return N},blob_create:()=>0,blob_size:N=>{N=L(N,4);if(0===N)return 0;N=l[N+8>>>2];S();return N},blob_read:(N,ha,fa,ja)=>{ha>>>=0;fa>>>=0;ja>>>=0;const sa=x(fa,ja);N=null!==sa?L(N,4):0;if(0===N)return 0;const qa=l[N+8>>>2];ja=ha<qa?Math.min(ja,qa-ha):0;r(sa,fa,e,N+16+ha,ja);S();return ja},retain:()=>0,release:()=>{}}}function K(q,a,f){const c=Atomics.load(f,2);2>c||(q=new Int32Array(q()),f=Atomics.load(f,3),0!==f&&Atomics.compareExchange(q,f>>>2,c,0),34>c&&Atomics.store(q,
((a>>>0)+16>>>2)+c-2,0))}function R(q){return String(q?.message??q)}function X(q,a,f=new Map){const c=t=>{const k=q().buffer;return D(k,t,A(k,t))},n={};for(var p of Ac)n[p]=t=>a(c(t));p=t=>k=>{k=c(k);const b=f.get(k);void 0===b?a(`Timer '${k}' does not exist`):(t&&f.delete(k),a(`${k}: ${(M()-b).toFixed(3)}ms`))};n["console.caller"]=()=>{};n["console.time"]=t=>f.set(c(t),M());n["console.timeLog"]=p(!1);n["console.timeEnd"]=p(!0);return n}function Y(q){let a=null,f=null;const c=p=>f??R(p),n={env:X(()=>
a,q.log,q.jb),rive_shared_v1:q.Ob(()=>a),rive_rt_v1:{now:q.now??M},rive_lane_v1:{error:(p,t)=>{f=D(a.buffer,p,t);q.Yd?.(f)},fuel_check:q.Ab??V}};void 0!==q.Hb&&(n[q.Hb]=q.uc(()=>a));try{const p=(new WebAssembly.Instance(q.module,n)).exports;a=p.memory;return{exports:p,memory:a,zb:c}}catch(p){return{error:f??R(p)}}}function U(q,a,f=!1){try{const c=q.exports;c[f?"__riveLaneReset":"__riveLiftedStart"]?.();const n=a.input,p=c.__rive_lane_alloc(n.length)>>>0;(new Uint8Array(q.memory.buffer,p,n.length)).set(n);
const t=c[a.prefix+a.yb](p,n.length,...(a.gd??[]));a.ra&&c.__rive_lane_free(p);return{result:t}}catch(c){return{error:q.zb(c)}}}function la(q){const a=Y(q);q=void 0===a.error?U(a,q):a;return void 0===q.error?{...a,result:q.result}:q}function ca(q,a,f,c,n,p){let t=null;const k=O=>{t??=O};var b=M()+1E3,e="processor init overran its budget";const g=la({module:q,Ob:O=>n(O,k),log:p,Ab:()=>{if(M()>b)throw e;},prefix:Ib.processor,yb:a,input:f,gd:[c.sampleRate,c.Wd,c.channels],ra:!0});if(void 0!==g.error||
null!==t)return{error:g.error??t};b=Infinity;e="processor overran its block budget";const l=g.exports,w=g.memory;let I=null;return{Da:{Mb(O,z,x,r=0){0<r&&(b=M()+r);try{const y=l.__rive_processor_process(O,z)>>>0;if(null!==t)return t;const v=O*c.channels;if(null===I||I.buffer!==w.buffer||I.byteOffset!==y||I.length!==v)I=new Float32Array(w.buffer,y,v);x(I);l.__riveFrameMinor?.();return null}catch(y){return g.zb(y)}finally{b=Infinity}}}}}function wa(q,a){a=performance.now()+a;for(let f=1;;f++){if(q())return!0;
if(0===(f&63)&&performance.now()>=a)return!1}}function Fa(){const q=new MessageChannel;return new Promise(a=>{q.port1.onmessage=()=>{q.port1.close();a()};q.port2.postMessage(0)})}function Pa(q,a,f,c){const n={},p={rive_rt_v1:{now:()=>{if(null!==f.view&&0!==Atomics.load(f.view,f.stop))throw Error("stopped by another part");return performance.now()+c},budget_exceeded:t=>{f.Qa=t;throw Error("execution exceeded timeout");},error:(t,k)=>{f.ja=[t,k]},debug_enter:()=>{},debug_line:()=>0,debug_leave:()=>
{}},rive_parallel_v1:{waiting:()=>{}}};for(const t of WebAssembly.Module.imports(q)){let k,b;q=(k=n)[b=t.module]??(k[b]={});"memory"===t.kind?q[t.name]=a:"function"===t.kind&&(q[t.name]=p[t.module]?.[t.name]??(()=>{throw Error(`parallel code called the host through ${t.module}.${t.name}`);}))}return n}function Aa(){function q(t,k,b){-1===Atomics.compareExchange(n,48,-1,t)&&(t=k.state,null!==t.ja?(n[49]=2,n[50]=t.ja[0],n[51]=t.ja[1]):0<=t.Qa?(n[49]=3,n[52]=t.Qa):(n[49]=1,b=(new TextEncoder).encode(String(b?.message??
b)).subarray(0,512),(new Uint8Array(n.buffer,4544,b.length)).set(b),n[53]=b.length),Atomics.store(k.view,k.state.stop,1))}function a(t){var k=128+16*p;if(Atomics.compareExchange(n,k+1,t,0)!==t)return!1;t=n[k+2];k=n[32];const b=c.get(n[33]);if(void 0===b)return!0;var e=b.memory.buffer;b.buffer!==e&&(b.buffer=e,b.view=new Int32Array(e));e=b.view;var g=n[34]>>>0;const l=b.state;l.ja=null;l.Qa=-1;l.view=e;l.stop=g+640>>>2;var w=b.exports;0!==b.Ec&&(w.__riveCallSpill.value=b.Ec+65520);try{w.__riveLoadGlobals(n[35])}catch(x){return q(t,
b,x),!0}const I=e[g+12>>>2],O=e[g>>>2],z=e[g+4>>>2];g=e[g+8>>>2]>>>2;w=w.__riveParallelCall;for(let x=t;x<I&&0===Atomics.load(e,l.stop);x+=k)try{w(O,e[g+x],z)}catch(r){q(t,b,r);break}return!0}async function f(){if(String(p)!==globalThis.process?.env?.RIVE_PARALLEL_DEAF_THREAD){var t=Atomics.load(n,0),k=()=>Atomics.load(n,0)!==t,b=globalThis.navigator?.userAgent??"";b="function"===typeof Atomics.waitAsync&&!(b.includes("AppleWebKit/")&&!b.includes("Chrome/"))&&void 0===globalThis.process?.env?.RIVE_PARALLEL_TIMED_WAITS;
Atomics.store(n,54,b?1:2);for(var e=performance.now();;)if(wa(k,.05))t=Atomics.load(n,0),Atomics.store(n,16*p+131,t),a(t)&&Atomics.store(n,128+16*p,t);else{Atomics.add(n,16,1);if(b){const g=Atomics.waitAsync(n,0,t);g.async&&await g.value}else 2<=performance.now()-e?(await Fa(),e=performance.now()):Atomics.wait(n,0,t,2);Atomics.sub(n,16,1)}}}const c=new Map;let n=null,p=-1;return{message(t){var k=t?.riveParallelTeam;if(void 0!==k)return n=new Int32Array(k.words),p=k.index,f(),!0;k=t?.riveParallelVm;
if(void 0!==k){t=new Int32Array(k.ready);const e={ja:null,Qa:-1,view:null,stop:0};try{var b=new WebAssembly.Module(k.bytes);const g=k.memory,l=(new WebAssembly.Instance(b,Pa(b,g,e,performance.timeOrigin-k.origin))).exports,w=void 0===l.__riveSpillFloor?0:k.spill;0!==w&&(l.__riveSpillFloor.value=w);c.set(k.key,{exports:l,memory:g,state:e,Ec:w,buffer:null,view:null});Atomics.store(t,p,1)}catch(g){Atomics.store(t,p,2)}Atomics.notify(t,p);return!0}b=t?.riveParallelDrop;return void 0!==b?(c.delete(b),
!0):!1}}}function Na(q){function a(b){for(p??={aa:new Int32Array(new SharedArrayBuffer(5056)),va:[],Fb:[]};p.va.length+1<Math.min(b,64);){const e=p.va.length,g=q.start();if(null===g)break;g.postMessage({riveParallelTeam:{words:p.aa.buffer,index:e}});p.va.push(g)}return p}function f(b){const e=p.Fb[b];if(void 0===e)return!0;if(Atomics.load(p.aa,16*b+131)===e)return!1;p.Fb[b]=void 0;return!0}function c(b,e,g){const l=p.aa,w=128+16*e;Atomics.load(l,w+1)===b.Xa&&(0===Atomics.load(b.view,b.stop)&&1E3<=
g-b.kd&&b.Aa(Error("a thread of the page's team did not start its part of a parallel call within 1000 ms")),0!==Atomics.load(b.view,b.stop)?Atomics.compareExchange(l,w+1,b.Xa,0)===b.Xa&&(p.Fb[e]=Atomics.load(l,w+3),b.Hc.add(e)):1<=g-b.Pc&&(b.Pc=g,Atomics.notify(l,0)))}function n(b,e){const g=p.aa;for(const l of b.qc){const w=128+16*l;for(let I=1;Atomics.load(g,w)!==b.Xa;I++)if(0===(I&1023)){if(b.Hc.has(l))break;if(0===Atomics.load(b.view,b.stop)&&void 0!==e)try{e()}catch(O){b.Aa(O)}c(b,l,performance.now())}}}
let p=null,t=1,k=null;return{Il:function(b,e,g){const l=b.instance.exports;if(1>=g||!q.qd()||void 0===l.__riveParallelCall||void 0===l.__riveSaveGlobals||void 0===l.__riveRawAlloc)return null;({va:g}=a(g));if(0===g.length)return null;const w=z=>{try{return l.__riveRawAlloc(z)>>>0}catch{return 0}},I=w(Math.max(l.__riveGlobalBytes.value,4));if(0===I)return null;const O={key:t++,mc:I,ready:new Int32Array(new SharedArrayBuffer(4*g.length)),Nb:!1};g.forEach((z,x)=>{const r=w(65520);0===r?Atomics.store(O.ready,
x,2):z.postMessage({riveParallelVm:{key:O.key,bytes:e,memory:b.memory,spill:r,ready:O.ready.buffer,origin:performance.timeOrigin}})});return O},ready:async function(b){const e=performance.now()+1E4;for(;b.ready.some(g=>0===g)&&performance.now()<e;)await new Promise(g=>setTimeout(g,1))},release:function(b){for(const e of p?.va??[])e.postMessage({riveParallelDrop:b.key})},Hl:function(b,e,g,l){if(e?.Nb)throw Error("parallel calls cannot nest");if(0!==(g&3))throw Error("parallel call control block is not aligned");
var w=b.memory.buffer;b.Nc?.buffer!==w&&(b.Nc=new Int32Array(w));const I=b.Nc;w=I[g+12>>>2];const O=[];for(var z=0;z<(e?.ready.length??0)&&O.length+1<w;z++)1===Atomics.load(e.ready,z)&&f(z)&&O.push(z);z=O.length+1;0!==I[g+16>>>2]&&(w=z,I[g+12>>>2]=w);I[g+16>>>2]=z>=w?1:0;for(var x of[128,256,384,512,516,640,20])Atomics.store(I,g+x>>>2,0);const r=b.instance.exports;b=r.__riveParallelCall;x=I[g+0>>>2];const y=I[g+4>>>2],v=I[g+8>>>2]>>>2;if(1===z){for(e=0;e<w;e++)b(x,I[v+e],y);return 1}const C=p.aa;
e.Nb=!0;try{r.__riveSaveGlobals(e.mc);C[32]=z;C[33]=e.key;C[34]=g;C[35]=e.mc;Atomics.store(C,48,-1);const S=Atomics.load(C,0)+1|0||1;O.forEach((xa,Ja)=>{xa=128+16*xa;C[xa+2]=Ja+1;Atomics.store(C,xa+1,S)});Atomics.store(C,0,S);0!==Atomics.load(C,16)&&Atomics.notify(C,0);let pa=null;var L=performance.now();k={qc:O,Xa:S,view:I,stop:g+640>>>2,kd:L,Pc:L,Hc:new Set,Aa(xa){pa??=xa;-1===Atomics.compareExchange(C,48,-1,0)&&Atomics.store(I,g+640>>>2,1)}};for(L=0;L<w&&0===Atomics.load(I,g+640>>>2);L+=z)try{b(x,
I[v+L],y)}catch(xa){k.Aa(xa);break}n(k,r.__riveFuelCheck);if(0<Atomics.load(C,48)){const xa=C[49];if(2===xa)l.ja(C[50],C[51]);else if(3===xa&&(l.md(C[52]),null!==pa))throw pa;const Ja=new Uint8Array(C[53]);Ja.set(new Uint8Array(C.buffer,4544,Ja.length));throw Error(1===xa?(new TextDecoder).decode(Ja):"parallel part trapped");}if(null!==pa)throw pa;return z}finally{e.Nb=!1,k=null}},waiting:function(){const b=k;if(null!==b){var e=performance.now();for(const g of b.qc)c(b,g,e)}},message:Aa().message,
be(b){b=Math.trunc(b??NaN);return Number.isFinite(b)?Math.min(Math.max(b,1),64):Math.min(globalThis.navigator?.hardwareConcurrency??1,8)},state(){const b=null===p?0:Atomics.load(p.aa,54);return{team:p?.va.length??0,waits:1===b?"async":2===b?"timed":"none"}}}}function Wa(q){q=[0,...q,11];return new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,q.length+2,1,q.length,...q])}function Ca(q){let a=0,f=8;const c=()=>{const [e,g]=Ka(q,f);f=g;return e},n=()=>{const e=q[f++];123===e&&(a=Math.max(a,
1));return 99!==e&&100!==e},p=()=>{var e=q[f++];if(253===e)e=c(),a=Math.max(a,256<=e&&275>=e?2:1),11>=e||92===e||93===e?(c()&64&&c(),c()):12===e||13===e?f+=16:21<=e&&34>=e?f+=1:84<=e&&91>=e&&(c()&64&&c(),c(),f+=1);else if(252===e){e=c();if(e>=ma.length)return!1;for(let g=0;g<ma[e];g++)c()}else if(254===e)3===c()?f+=1:(c()&64&&c(),c());else if(40<=e&&62>=e)c()&64&&c(),c();else if(2<=e&&4>=e)123===q[f]&&(a=Math.max(a,1)),c();else if(14===e)for(e=c();0<=e&&f<q.length;e--)c();else if(28===e)for(e=c();0<
e&&f<q.length;e--){if(!n())return!1}else if(17===e||19===e)c(),c();else if(67===e||68===e)f+=67===e?4:8;else if(32<=e&&38>=e||ba.includes(e))c();else if(!(1>=e||5===e||11===e||15===e||26===e||27===e||209===e||69<=e&&196>=e))return!1;return!0};for(;f<q.length;){var t=q[f];const [e,g]=Ka(q,f+1);f=g;if(1===t)for(t=c();0<t&&f<q.length;t--){if(96!==q[f++])return-1;for(var k=0;2>k;k++)for(var b=c();0<b&&f<q.length;b--)if(!n())return-1}else if(10===t)for(t=c();0<t&&f<q.length;t--){k=Math.min(c()+f,q.length);
for(b=c();0<b&&f<k;b--)if(c(),!n())return-1;for(;f<k;)if(!p())return-1}f=g+e}return a}function Ka(q,a){let f=0,c=0,n;do n=q[a++],f|=(n&127)<<c,c+=7;while(n&128);return[f>>>0,a]}function Qa(q){const a=[];do{const f=q&127;q>>>=7;a.push(q?f|128:f)}while(q);return a}function cb(q){const a=[];for(let f=8;f<q.length;){const [c,n]=Ka(q,f+1);a.push({id:q[f],at:f,body:n,end:n+c});f=n+c}return a}function rb(q){const a=[];for(const f of cb(q)){if(0!==f.id)continue;const [c,n]=Ka(q,f.body);Z.some(p=>p.length===
c&&p.every((t,k)=>q[n+k]===t))&&a.push(q.subarray(n+c,f.end))}return a}function sb(q){var a=cb(q);const f=a.find(t=>8===t.id);var c=a.filter(t=>t!==f);if(void 0===f||!c.some(t=>7===t.id))return q;const n=Ka(q,f.body)[0];a=[q.subarray(0,8)];for(var p of c){c=q.subarray(p.body,p.end);if(7===p.id){const [t,k]=Ka(q,p.body);c=Array.from("__riveLiftedStart",b=>b.charCodeAt(0));c=Uint8Array.from([...Qa(t+1),...q.subarray(k,p.end),...Qa(c.length),...c,0,...Qa(n)])}a.push(Uint8Array.from([p.id,...Qa(c.length)]),
c)}q=new Uint8Array(a.reduce((t,k)=>t+k.length,0));p=0;for(const t of a)q.set(t,p),p+=t.length;return q}function yb(q){var a=cb(q),f=a.find(O=>5===O.id);const c=a.find(O=>2===O.id);if(void 0===f||void 0===c)return{X:q,memory:null};let [n,p]=Ka(q,f.body);var t=q[p++];if(1!==n||0===(t&2))return{X:q,memory:null};const [k,b]=Ka(q,p);var e=t&1?Ka(q,b)[0]:65536,g="function"===typeof SharedArrayBuffer&&!1!==globalThis.crossOriginIsolated,l=e;t=null;if(g)for(l=Math.min(e,32768);;)try{t=new WebAssembly.Memory({initial:k,
maximum:l,shared:g});break}catch(O){if(!(O instanceof RangeError)||l<=k)throw O;l=Math.max(k,l>>>1)}else t=new WebAssembly.Memory({initial:k,maximum:l});e=O=>[...Qa(O.length),...Array.from(O,z=>z.charCodeAt(0))];l=[...e(va[0]),...e(va[1]),2,g?3:1,...Qa(k),...Qa(l)];const [w,I]=Ka(q,c.body);g=[q.subarray(0,8)];for(const O of a)O!==f&&(a=q.subarray(O.body,O.end),O===c&&(a=Uint8Array.from([...Qa(w+1),...q.subarray(I,O.end),...l])),g.push(Uint8Array.from([O.id,...Qa(a.length)]),a));q=new Uint8Array(g.reduce((O,
z)=>O+z.length,0));f=0;for(const O of g)q.set(O,f),f+=O.length;return{X:q,memory:t}}function bc(q){var a=cb(q);const f=a.find(b=>11===b.id);if(void 0===f)return q;let [c,n]=Ka(q,f.body);const p=[Uint8Array.from(Qa(c))];for(var t=0;t<c;t++){var k=void 0;[k,n]=Ka(q,n);2===k&&(n=Ka(q,n)[1]);if(1!==k)for(k=q[n++];11!==k;k=q[n++])n=Ka(q,n)[1];const [b,e]=Ka(q,n);p.push(Uint8Array.from([1,...Qa(b)]),q.subarray(e,e+b));n=e+b}t=[q.subarray(0,8)];for(const b of a)a=b===f?kb(p):q.subarray(b.body,b.end),t.push(Uint8Array.from([b.id,
...Qa(a.length)]),a);return kb(t)}function kb(q){const a=new Uint8Array(q.reduce((c,n)=>c+n.length,0));let f=0;for(const c of q)a.set(c,f),f+=c.length;return a}function cc(q,a,f,c){switch(c){case 0:return q();case 1:return q(a[f]);case 2:return q(a[f],a[f+1]);case 3:return q(a[f],a[f+1],a[f+2]);case 4:return q(a[f],a[f+1],a[f+2],a[f+3]);case 5:return q(a[f],a[f+1],a[f+2],a[f+3],a[f+4]);case 6:return q(a[f],a[f+1],a[f+2],a[f+3],a[f+4],a[f+5]);case 7:return q(a[f],a[f+1],a[f+2],a[f+3],a[f+4],a[f+5],
a[f+6]);case 8:return q(a[f],a[f+1],a[f+2],a[f+3],a[f+4],a[f+5],a[f+6],a[f+7]);default:return q(...a.subarray(f,f+c))}}const Ac="console.caller console.log console.debug console.info console.warn console.error".split(" "),Bc=[["rive_rt_v1","now",["job","worker"],null],["rive_lanes_v1","wait_within",[],"blocks on a signal, which only the main lane may; a worker awaits Signal.next or Port.receive instead"],["rive_shared_v1","region_lock",["job","worker"],"locks a shared region, which the audio thread may not wait on; share through atomics, rings and snapshots instead"],
["rive_shared_v1","read_done",[],null],["rive_shared_v1",null,["job","worker","processor"],null],["rive_lane_v1",null,["job","worker","processor"],null],["rive_job_v1",null,["job"],null],["rive_worker_v1",null,["worker"],null],["env","console.caller",["job","worker","processor"],null],["env","console.log",["job","worker","processor"],null],["env","console.debug",["job","worker","processor"],null],["env","console.info",["job","worker","processor"],null],["env","console.warn",["job","worker","processor"],
null],["env","console.error",["job","worker","processor"],null],["env","console.time",["job","worker"],null],["env","console.timeLog",["job","worker"],null],["env","console.timeEnd",["job","worker"],null]],tb=[["rive.jobs","job"],["rive.workers","worker"],["rive.audio","processor"]],Ib={job:"__rive_job_",worker:"__rive_worker_",processor:"__rive_processor_"},dc={starting:0,running:1,done:2,failed:3,stopped:4},H=new Map,M=void 0!==globalThis.performance?()=>globalThis.performance.now():Date.now,V=
()=>{},W=[253,12,...Array(16).fill(0)],aa=Wa([...W]),ea=Wa([...W,...W,253,128,2]),ma=[0,0,0,0,0,0,0,0,2,1,2,1,2,1,2,1,1,1],ba=[12,13,16,18,63,64,65,66,208,210],Z=tb.map(([q])=>Array.from(q,a=>a.charCodeAt(0))),va=["rive_parallel_v1","memory"];(function(q){function a(B,J=null){return{pd:h(ia.Od,B,J),ga:ia.ga,Ia:ia.Ia,hb:ia.hb,Ha:ia.Ha,Gb:ia.Gb,ra:ia.ra,Va:Ga}}function f(B){Jb??={Dc:qb(aa),Ac:qb(ea)};B=[B,...rb(B)];if(Jb.Dc&&Jb.Ac||B.every(J=>qb(J)))return null;B=Math.max(...B.map(Ca));return!Jb.Dc&&
0<B?"this browser lacks WebAssembly SIMD, so this file's scripts are off; bake with wasmSimd: off to support it":Jb.Ac||2!==B?null:"this browser lacks WebAssembly relaxed SIMD, so this file's scripts are off; bake with wasmSimd: on to support it"}function c(B){const {X:J,memory:Q}=yb(B.X);B.fb=Q;return J}function n(B,J){null!==J&&null!==B.instance&&(B.sa=lb.Il(B,J,B.wc()))}function p(B,J){const Q=d(a(B.P),()=>{if(null===B.memory)throw Error("script passed memory to the host while its module was still starting");
return B.memory});if(null!==B.fb){let T;const da=Q[T=va[0]]??(Q[T]={});da[va[1]]=B.fb;const ka=da.size,oa=Cc(B);da.size=()=>oa&&1<ka()?lb.be(Da.parallelParts):1;const ua=Q.rive_rt_v1,ra=ua.budget_exceeded;ua.budget_exceeded=ya=>{B.dc=!0;return ra(ya)};const Ia={ja:(ya,Kb)=>ua.error(ya,Kb),md:ya=>B.dc?void 0:ra(ya)};da.run=ya=>{B.dc=!1;return lb.Hl(B,B.sa,ya>>>0,Ia)};da.waiting=lb.waiting;B.wc=da.size}for(const T of WebAssembly.Module.imports(J))if("function"===T.kind){let da,ka,oa,ua;(oa=(da=Q)[ka=
T.module]??(da[ka]={}))[ua=T.name]??(oa[ua]=m(T.module,T.name))}return Q}function t(B,J){const Q=ia.Ia();for(const {name:T}of WebAssembly.Module.exports(J)){if(!T.startsWith("__rive"))continue;J=3*T.length+1;const da=ia.hb(J);ia.Sc(T,da,J);ia.exports._rive_web_vm_module_export(B.P.g,da)}ia.Ha(Q);B=ia.exports._rive_web_vm_start_refusal(B.P.g);if(0!==B)throw Error(ia.La(B));}function k(B,J){B.memory=J.exports.memory;B.X=null;B.od=Object.keys(J.exports).filter(ra=>ra.startsWith("__riveCall")).map(ra=>
J.exports[ra]).filter(ra=>{if(!(ra instanceof WebAssembly.Global))return!1;try{return ra.value=ra.value,!0}catch{return!1}});B.nd=[];const Q=ia.exports._rive_web_vm_start_fuel(B.P.g),T=J.exports.__riveFuelArm,da=J.exports.__riveFuelEnd,ka=0<Q&&void 0!==T&&void 0!==da,oa=ia.exports._rive_web_vm_booting;oa(B.P.g);const ua=ia.Ia();B.instance=J;try{ka&&T(Q),J.exports.__riveLiftedStart?.(),ka&&da()}catch(ra){throw B.instance=null,ia.Ha(ua),B.P.j=null,ra;}finally{oa(0)}}async function b(B){try{const T=
sb(c(B)),da=await WebAssembly.compile(T),ka=Cc(B)&&null!==Lb?bc(T):null;if(0!==B.P.g){t(B,da);var J=I(da);ja(da);var Q=await WebAssembly.instantiate(da,p(B,da));await J;0!==B.P.g&&(k(B,Q),n(B,ka),null!==B.sa&&await lb.ready(B.sa))}}catch(T){B.error=R(T)}}function e(B,J){if(B.length!==J.length)return!1;for(let Q=0;Q<B.length;Q++)if(B[Q]!==J[Q])return!1;return!0}function g(B,J,Q){B={X:B,module:J,error:Q,Ba:new Set,Cb:null};zb.push(B);8<zb.length&&zb.shift();return B}function l(B,J){if(!jd(B)){g(B,J,
null);for(const Q of kd())Q.postMessage({riveLane:{bytes:B,module:J}})}}function w(B,J){for(const da of WebAssembly.Module.imports(B)){a:{B=J;var Q=da.module,T=da.name;for(const [ka,oa,ua,ra]of Bc)if(Q===ka&&(null===oa||T===oa)){B=ua.includes(B)?null:ra??"";break a}B=""}if(null!==B)throw Error("lane module imports "+da.module+"."+da.name+", which it cannot reach");}}function I(B,J=!1){const Q=[];for(const [T,da]of tb)for(const ka of WebAssembly.Module.customSections(B,T)){const oa=sb(new Uint8Array(ka));
if(jd(oa))continue;const ua=ra=>{w(ra,da);l(oa,ra)};if(J)try{ua(new WebAssembly.Module(oa))}catch(ra){}else Q.push(WebAssembly.compile(oa).then(ua).catch(()=>{}))}return Promise.all(Q)}function O(B,J,Q){let T=zb.find(da=>da.Ba.has(B));if(void 0===T){const da=J();T=zb.find(ka=>e(ka.X,da));if(void 0===T){T=g(da,null,null);try{const ka=new WebAssembly.Module(da);w(ka,Q);T.module=ka}catch(ka){T.error=R(ka)}}T.Ba.add(B);8<T.Ba.size&&T.Ba.delete(T.Ba.values().next().value)}return T}function z(B=!1,J=0){return(Q,
T)=>B?E(()=>ia.ga().buffer,ia.exports._rive_shared_table(),J,Q,null,T):d(a({g:1,j:null,h:!1,Va:Ga},"rive_shared_v1"),Q,"rive_shared_v1").rive_shared_v1}function x(B){B=ia.Ud(B);if(null!==B)throw B;}function r(B){const J=B.Cb;B.Cb=null;if(null!==J)return J.jb.clear(),J;const Q={Da:0,ec:null,Bc:0,jb:new Map,reset:!1};return Object.assign(Q,Y({module:B.module,Hb:"rive_job_v1",uc:()=>({cancelled:()=>Q.ec(),reuse_pages:()=>Q.Bc}),Ob:z(),log:T=>ia.Eb(Q.Da,T),jb:Q.jb,now:Za,Ab:()=>x(Q.Da)}))}function y(){var B=
Da.audioWorkletUrl;if("string"===typeof B)return B;B=q.riveAudioWorkletSource;if(ec()||"string"!==typeof B)return null;ld??=URL.createObjectURL(new Blob([B],{type:"text/javascript"}));return ld}function v(){if(!ec()&&!0!==globalThis.crossOriginIsolated)return"real time audio needs cross origin isolation";if("undefined"===typeof SharedArrayBuffer||!(ia.memory().buffer instanceof SharedArrayBuffer))return"real time audio needs librive built with threads";if(null===y())return"real time audio needs riveScripting.audioWorkletUrl";
if("undefined"===typeof AudioContext)return"real time audio needs Web Audio";const B=Da.audioContext;return"closed"===B?.state?"real time audio cannot start on a closed AudioContext":Dc.get(B)?.Pb?"real time audio stalled the host's AudioContext; hand riveScripting a new one":null}function C(){let B=[],J=null;return{Fa(Q){null!==J?J(Q):B.push(Q)},open(Q){J=Q;for(const T of B)J(T);B=[]},Aa(Q){for(const T of B)Oa({id:T.id,kind:"failed",text:Q});B=[]}}}function L(B){return{numberOfInputs:0,numberOfOutputs:1,
outputChannelCount:[2],processorOptions:{memory:ia.memory(),table:ia.exports._rive_shared_table(),counter:B.buffer}}}function S(B){for(const J of[...Ea.ha.keys()])Oa({id:J,kind:"failed",text:B})}function pa(B,J,Q,T,da,ka=da){let oa=!1,ua=-1,ra=0;const Ia=setInterval(()=>{if("closed"===B.state)clearInterval(Ia),ka("script audio context closed");else{var ya=Atomics.load(J,0),Kb=(0<Ea.ha.size||0<ra)&&"running"===B.state;ra=ya===ua&&Kb?ra+1:0;ua=ya;ya=oa?0!==Atomics.load(J,1)?30:T:Q;ra>=ya&&(clearInterval(Ia),
da(oa?"processor stalled the audio thread":"script audio worklet never answered"))}},50);return{ready(){oa=!0;ra=0},stop:()=>clearInterval(Ia)}}function xa(B,J){return{context:B,Fa:J.Fa,Ga:new Set,fe:J,W:null}}function Ja(B,J,Q=!0){B.fe.Aa(J);Ea.output===B&&(Ea.output=null);Q&&void 0===Da.audioContext&&B.context.close?.()}function Gb(B){let J=Dc.get(B);void 0===J&&(J={aa:new Int32Array(new SharedArrayBuffer(16)),Pb:!1},Dc.set(B,J),B.addEventListener("statechange",()=>{"closed"!==B.state||J.Pb||md(J.aa)}));
return J}function Hb(){const B=globalThis.navigator?.audioSession;"auto"===B?.type&&(B.type="playback")}function fb(B,J=()=>B.resume()){if(!Ec.has(B)){Ec.add(B);var Q=["pointerdown","pointerup","keydown","touchend"],T=()=>J(),da=setTimeout(()=>console.warn("script audio waits for a click, tap or key press on the page"),1E3),ka=()=>{if("running"===B.state||"closed"===B.state){Ec.delete(B);clearTimeout(da);B.removeEventListener("statechange",ka);for(const oa of Q)globalThis.removeEventListener(oa,T,
{capture:!0})}};for(const oa of Q)globalThis.addEventListener(oa,T,{capture:!0});B.addEventListener("statechange",ka);ka()}}function ac(){Hb();const B=new AudioContext;fb(B);return B}function xb(B,J){let Q=!0,T=!1;const da=()=>{Q&&"running"===B.state&&(T=!0,B.suspend())};B.addEventListener("statechange",da);da();return()=>{Q=!1;B.removeEventListener("statechange",da);Hb();const ka=globalThis.navigator?.userActivation;var oa=globalThis.document?.permissionsPolicy??globalThis.document?.featurePolicy;
oa=(globalThis.top??globalThis)!==globalThis&&!1!==oa?.allowsFeature?.("autoplay");(T||oa||!1!==ka?.hasBeenActive)&&B.resume();"running"!==B.state&&fb(B);J()}}function N(B=!1){const J=Da.audioContext??(B?new AudioContext:ac()),Q=C(),T=xa(J,Q),da=Gb(J);let ka=null,oa=null;const ua=ya=>{Ea.output===T&&(oa?.stop(),S(ya),Ja(T,ya,!1))},ra=ya=>{da.Pb=!0;ka.port.onmessage=null;ka.port.postMessage({kind:"end"});ka.disconnect();S(ya);Ja(T,ya,!1)},Ia=()=>{oa=pa(J,da.aa,Infinity,20,ra,ua);null!==ka&&oa.ready()};
J.addEventListener("statechange",()=>{"closed"===J.state&&ua("script audio context closed")});J.audioWorklet.addModule(y()).then(()=>{ka=new AudioWorkletNode(J,"rive-processors",L(da.aa));ka.port.onmessage=ya=>Oa(ya.data);ka.connect(J.destination);oa?.ready();Q.open(ya=>ka.port.postMessage(ya))}).catch(ya=>{oa?.stop();Ja(T,Fc(ya))});B?T.W=xb(J,Ia):Ia();return T}function ha(){const B=Da.audioWorkletUrl;let J=Da.audioContext;void 0===J&&(globalThis.nrdp.audio.output.open(),J=new AudioContext);J.forceStart?.();
const Q=C(),T=xa(J,Q),da=new Int32Array(new SharedArrayBuffer(16));let ka=null,oa=!1,ua=!1;const ra=Ua=>{if(!ua){ua=!0;Ia.stop();ka?.terminate();if(oa){for(const Ab=M()+200;M()<Ab;);md(da);S(Ua)}Ja(T,Ua)}},Ia=pa(J,da,40,2,ra),ya=Ua=>(...Ab)=>{try{Ua(...Ab)}catch(fc){ra(Fc(fc))}},Kb=ya(()=>{(new AudioWorkletNode(J,"rive-processors",L(da))).connect(J.destination);oa=!0;Ia.ready();Q.open(Ua=>ka.send(Ua))});fetch(B).then(Ua=>{if(!Ua.ok)throw Error(B+" answered HTTP "+Ua.status);return Ua.text()}).then(Ua=>
{if(!ua){var Ab=J.audioWorklet;Ab.active=!0;Ab.init(ya(()=>{ua||(ka=globalThis.nrdp.thread.start({url:B,source:Ua,audio:J}),ka.addEventListener("raw-message",fc=>"ready"===fc.kind?Kb():Oa(fc)))}))}}).catch(Ua=>ra(Fc(Ua)));return T}function fa(){Ea.output?.W&&void 0!==Da.audioContext&&(Ea.output.context.close(),Ea.output=null);let B;(B=Ea).output??(B.output=ec()?ha():N());return Ea.output}function ja(B){try{null===Ea.output&&!1!==Da.audioEarly&&void 0===Da.audioContext&&!ec()&&tb.some(([J,Q])=>"processor"===
Q&&0<WebAssembly.Module.customSections(B,J).length)&&!0===globalThis.matchMedia?.("(hover: hover) and (pointer: fine)").matches&&0===globalThis.navigator?.maxTouchPoints&&"disallowed"!==globalThis.navigator?.getAutoplayPolicy?.("audiocontext")&&null===v()&&(Ea.output=N(!0))}catch{}}function sa(B){const J=new Set([...Ea.ha.values()].map(Q=>Q.rc));for(const Q of B.Ga){if(8>=B.Ga.size)break;J.has(Q)||(B.Ga.delete(Q),B.Fa({kind:"forget",moduleId:Q}))}}function qa(B,J,Q){const T=J.td;B.Ga.add(J.rc);B.Fa({...J.start,
bytes:Q?T.X:null})}function Oa(B){const J=Ea.ha.get(B.id);void 0!==J&&("resend"===B.kind?null!==Ea.output&&qa(Ea.output,J,!0):ia.ee(J.Zd,ze[B.kind],B.text??""))}let ia=null,Za=M;const Ma=new Map,Ga={i:!1,l:0,Ta:0,Ra:0,Sa:0,Ua:0},qb=q.riveScriptingValidate??(B=>WebAssembly.validate(B)),Ae=!0===q.riveScriptingLaneTwin;let Jb=null;const Cc=B=>"function"===typeof SharedArrayBuffer&&B.fb?.buffer instanceof SharedArrayBuffer,zb=[];let kd=()=>[],Lb=null;const lb=Na({qd:()=>null!==Lb,start(){const B=ia.exports._rive_web_parallel_team_thread();
return 0===B?null:Lb(B)??null}}),jd=B=>zb.some(J=>e(J.X,B)),nd=B=>{lb.message(B)||(B=B?.riveLane,void 0!==B&&l(B.bytes,B.module))},od=globalThis.process?.Ul?.("worker_threads");!1===od?.Vl?od.Zl.i("message",nd):void 0!==globalThis.WorkerGlobalScope&&globalThis.addEventListener("message",B=>nd(B.data));const gc=new Map;let Be=1;const Gc=new Map;let Ce=1;const Ea={output:null,ha:new Map,next:1},ec=()=>void 0!==globalThis.nrdp?.audio?.output;let ld=null;const md=B=>K(()=>ia.memory().buffer,ia.exports._rive_shared_table(),
B),Fc=B=>"script audio has no worklet: "+R(B),Dc=new WeakMap,Ec=new WeakSet,ze={running:dc.running,failed:dc.failed,log:4294967295},Da={jd(B){if(null===ia){ia=B;var J=performance.timeOrigin-ia.$d||0;Za=()=>performance.now()+J}},Sl(B,J){kd=B;Lb=J},register(B,J){J=J.slice();Ma.set(B,{P:{g:B,j:null,h:!1,Va:Ga},X:J,instance:null,memory:null,fb:null,wc:null,sa:null,ia:null,error:f(J),names:new Map})},release(B){const J=Ma.get(B);J&&(J.P.g=0,Ma.delete(B),null!==J.sa&&lb.release(J.sa))},Yl(){return lb.state()},
de(){const B=[];for(const J of Ma.values())if(null===J.instance&&null===J.error){let Q;(Q=J).ia??(Q.ia=b(J));B.push(J.ia)}return Promise.all(B)},start(B){B=Ma.get(B);if(!B)return"script module was never registered";if(null===B.instance&&null===B.error){if(null!==B.ia)return"script module is still being prepared";try{const J=sb(c(B)),Q=new WebAssembly.Module(J);t(B,Q);I(Q,!0);ja(Q);k(B,new WebAssembly.Instance(Q,p(B,Q)));n(B,Cc(B)&&null!==Lb?bc(J):null)}catch(J){B.error=R(J)}}return B.error},ia(B){B=
Ma.get(B);return null===B?.instance&&null===B.error&&null!==B.ia?1:0},Md(B,J){return"function"===typeof Ma.get(B)?.instance?.exports[ia.La(J)]?1:0},call(B,J,Q,T,da,ka,oa){B=Ma.get(B);if(!B||null===B.instance)return 1;let ua=B.names.get(J);void 0===ua&&(ua=B.instance.exports[ia.La(J)]??null,B.names.set(J,ua));if("function"!==typeof ua)return 1;J=B.od;const ra=B.nd,Ia=ra.length;for(let ya=0;ya<J.length;ya++)ra.push(J[ya].value);try{const ya=cc(ua,ia.oc(),T>>3,Q);ia.oc()[da>>3]="number"===typeof ya?
ya:0;return 0}catch(ya){return B.P.j=null,ia.Sc(R(ya),ka,oa),B.P.h?3:2}finally{for(Q=0;Q<J.length;Q++)J[Q].value=ra[Ia+Q];ra.length=Ia}},ge(B,J){if(B=Ma.get(B))B.P.j=ia.La(J)},read(B,J,Q,T){B=Ma.get(B)?.memory;if(!B||J+T>B.buffer.byteLength)return 0;ia.ga().set(new Uint8Array(B.buffer,J,T),Q);Ga.i&&(Ga.Sa+=T);return 1},write(B,J,Q,T){B=Ma.get(B)?.memory;if(!B||J+T>B.buffer.byteLength)return 0;(new Uint8Array(B.buffer,J,T)).set(ia.ga().subarray(Q,Q+T));Ga.i&&(Ga.Ua+=T);return 1},Ol(B,J){B=Ma.get(B)?.memory;
if(!B||J>=B.buffer.byteLength)return-1;B=(new Uint8Array(B.buffer)).indexOf(0,J);return 0>B?-1:B-J},ae(B){return(B=Ma.get(B)?.memory)?B.buffer.byteLength/65536:0},Fd(){const B=[];for(const J of Ma.keys()){const Q=ia.exports._rive_web_vm_frame_boundary(J);0!==Q&&B.push(ia.La(Q))}return B},wd(B){Ga.i=!!B;Ga.l=0;Ga.Ta=0;Ga.Ra=0;Ga.Sa=0;Ga.Ua=0},Pd(){return{hostCalls:Ga.l,bytesStaged:Ga.Ta,bytesCopiedOut:Ga.Ra,bytesRead:Ga.Sa,bytesWritten:Ga.Ua}},runJob:function(B,J,Q,T,da,ka,oa){J=O(J,Q,"job");if(null!==
J.error)return{ok:!1,error:J.error};Q=r(J);if(void 0!==Q.error)return{ok:!1,error:Q.error};Q.Da=B;Q.ec=ka;Q.Bc=oa;B=U(Q,{prefix:Ib.job,yb:T,input:da},Q.reset);if(void 0!==B.error)return{ok:!1,error:B.error};try{const ua=Q.memory.buffer,ra=new Uint32Array(ua,B.result>>>0,2),Ia=0===ra[1]?new Uint8Array(0):new Uint8Array(ua,ra[0],ra[1]);void 0!==Q.exports.__riveLaneReset&&ua.byteLength<=65536*oa&&!ka()&&(Q.reset=!0,J.Cb=Q);return{ok:!0,output:Ia}}catch(ua){return{ok:!1,error:Q.zb(ua)}}},workerStart:function(B,
J,Q,T,da,ka){J=O(J,Q,"worker");if(null!==J.error)return{ok:!1,error:J.error};T=la({module:J.module,Hb:"rive_worker_v1",uc:oa=>({finished:(ua,ra,Ia)=>ka.finished(ua,new Uint8Array(oa().buffer,ra>>>0,Ia>>>0)),wait:ka.wait,stopping:ka.Nl}),Yd:oa=>ia.Td(B,oa),Ob:z(),log:oa=>ia.Eb(B,oa),now:Za,Ab:()=>x(B),prefix:Ib.worker,yb:T,input:da,ra:!0});if(void 0!==T.error)return{ok:!1,error:T.error};da=Be++;gc.set(da,{wake:T.exports.__rive_worker_wake,sd:T.exports.__riveFrameMinor});return{ok:!0,id:da}},workerWake:function(B,
J,Q){try{return gc.get(B).wake(J,Q),null}catch(T){return R(T)}},workerCollect:function(B){try{return gc.get(B)?.sd?.(),null}catch(J){return R(J)}},workerEnd:function(B){gc.delete(B)},processorStart:function(B,J,Q,T,da,ka,oa){J=O(J,Q,"processor");if(null!==J.error)return{ok:!1,error:J.error};T=ca(J.module,T,da,ka,z(Ae,oa),ua=>ia.Eb(B,ua));if(void 0!==T.error)return{ok:!1,error:T.error};da=Ce++;Gc.set(da,T.Da);return{ok:!0,id:da}},processorRender:function(B,J,Q,T){return Gc.get(B).Mb(J,Q,T)},processorEnd:function(B){Gc.delete(B)}};
Da.audioRefusal=v;Da.audioSampleRate=()=>{const B=fa();!0===globalThis.navigator?.userActivation?.isActive?(B.W?.(),B.W=null):B.W&&fb(B.context,()=>{if(B.W){B.W?.();B.W=null;var J=void 0}else J=B.context.resume();return J});return B.context.sampleRate};Da.audioStart=function(B,J,Q,T,da,ka,oa,ua){const ra=O(J,Q,"processor");if(null!==ra.error)return{ok:!1,error:ra.error};Q=fa();Q.W?.();Q.W=null;const Ia=Ea.next++;B={Zd:B,rc:J,td:ra,start:{kind:"start",id:Ia,moduleId:J,entry:T,input:da,format:{sampleRate:ka.sampleRate,
maxFrames:ka.Wd,channels:ka.channels},hardBlocks:oa,sharedOwner:ua}};Ea.ha.set(Ia,B);qa(Q,B,!Q.Ga.has(J));sa(Q);return{ok:!0,id:Ia}};Da.audioStop=function(B){Ea.ha.delete(B);null!==Ea.output&&(Ea.output.Fa({kind:"stop",id:B}),sa(Ea.output))};Da.audioState=()=>({context:Ea.output?.context.state??"none",processors:Ea.ha.size});Da.prepare=Da.de;Da.frameBoundary=Da.Fd;Da.countHostCalls=Da.wd;Da.hostCallCounts=Da.Pd;return q.riveScripting=Da})(F)})();function Ra(){}const Sa=new Int32Array(5);
function Ta(d,h,m,u,A){d(h,m,Sa);d=Math.max(Sa[0],0);const D=Math.max(Sa[1],0);h=Math.min(Sa[2],Math.ceil(u*h));m=Math.min(Sa[3],Math.ceil(A*m));Sa[4]=d!==Sa[0]||D!==Sa[1]||h!==Sa[2]||m!==Sa[3]?1:0;Sa[0]=d;Sa[1]=D;Sa[2]=h;Sa[3]=m;return h>d&&m>D}function Va(){var d=(d=Xa())?d.cd:0;return 0===d?0:d}
function Ya(d,h,m,u,A,D,G,E,K,R,X){var Y=Va(),U=Y-1,la=U-6;if(!(0<la))return R(),Ra;let ca=1,wa=1;if(!Ta(E,ca,wa,m,u))return R(),Ra;const Fa=Sa[2]-Sa[0],Pa=Sa[3]-Sa[1];if(Fa>U||Pa>U)if(ca*=Math.min(1,la/Fa),wa*=Math.min(1,la/Pa),!Ta(E,ca,wa,m,u))return R(),Ra;m=Sa[0];u=Sa[1];U=Sa[2];la=Sa[3];E=0!==Sa[4];if(1>ca||1>wa)--m,--u,U+=1,la+=1;const Aa=U-m,Na=la-u;d.s||(d.s=new F.DynamicRectanizer(Y),d.s.reset(512,512));Y=d.s.addRect(Aa+1,Na+1);if(0>Y&&(X(),Y=d.s.addRect(Aa+1,Na+1),0>Y))return console.assert(!1,
"draw does not fit in an empty atlas"),R(),Ra;const Wa=Y&65535,Ca=Y>>16;d.A.push({hd:[ca*A[0],wa*A[1],ca*A[2],wa*A[3],ca*A[4]-m+Wa,wa*A[5]-u+Ca],bc:Wa,cc:Ca,Rl:Aa,Nd:Na,sc:E,vd:K,ie:()=>{R()}});const Ka=m/ca,Qa=u/wa,cb=Aa/ca,rb=Na/wa,sb=d.R;return function(){const yb=sb.canvas();yb&&(h.save(),h.resetTransform(),h.globalCompositeOperation=D,h.globalAlpha=G,h.drawImage(yb,Wa,Ca,Aa,Na,Ka,Qa,cb,rb),h.restore())}}
class $a{constructor(){this.R=new ab;this.s=null;this.A=[];this.$a=new Ba;this.Z=new Ba}}let bb=null,db=!1,eb=!1,gb=null;
function hb(d){function h(){eb||(eb=!0,console.error("WebGL context lost. Draws that rely on the WebGL2 renderer will be dropped."))}const m=document.createElement("canvas");m.width=1;m.height=1;var u={alpha:!0,depth:d,stencil:d,antialias:d,premultipliedAlpha:!0,preserveDrawingBuffer:0,powerPreference:"high-performance",failIfMajorPerformanceCaveat:0,enableExtensionsByDefault:!1,explicitSwapControl:0,renderViaOffscreenBackBuffer:0};d=m.getContext("webgl2",u);if(!d)return null;m.addEventListener("webglcontextlost",
h);u=ib(d,u);jb(u);const A=F.makeWebGL2Renderer(m.width,m.height);if(!A)return mb(u),nb(m,d,h),null;A.ob=u;A.ka=m;A.Yb=d;A.ed=h;A.ac=m.width;A.Zb=m.height;A.ad=!!d.getExtension("WEBGL_shader_pixel_local_storage");A.cd=Math.min(d.getParameter(d.MAX_RENDERBUFFER_SIZE),d.getParameter(d.MAX_TEXTURE_SIZE));return A}function nb(d,h,m){d.removeEventListener("webglcontextlost",m);(d=h.getExtension("WEBGL_lose_context"))&&d.loseContext()}
function Xa(){if(eb)return null;if(db)return bb;db=!0;var d=hb(!0);if(!d)return console.log("No WebGL2 support. Draws that Canvas2D can't make will be dropped."),null;if(d.ad)var h=!0;else{h=d.Yb;var m=h.getExtension("WEBGL_debug_renderer_info");if(m){var u=h.getParameter(m.UNMASKED_RENDERER_WEBGL);h=h.getParameter(m.UNMASKED_VENDOR_WEBGL).includes("Google")&&u.includes("ANGLE Metal Renderer")}else h=!1}return h&&(jb(d.ob),d["delete"](),mb(d.ob),nb(d.ka,d.Yb,d.ed),d=hb(!1),!d)?null:bb=d}
class ob{constructor(d){this.la=d;this.path=F.makeWebGL2Path();this.path.fillRule(d)}moveTo(d,h){this.path.moveTo(d,h)}lineTo(d,h){this.path.lineTo(d,h)}fc(d,h,m,u,A,D){this.path.cubicTo(d,h,m,u,A,D)}close(){this.path.close()}addPath(d,h,m,u,A,D,G){const E=new ob(this.la);for(const K of d)K(E);E.Wa();this.path.addPath(E.path,h,m,u,A,D,G);E.dispose()}Wa(){}Oc(){return!1}dispose(){this.path.unref();this.path=null}}
class ab{constructor(){this.Rb=!0}canvas(){return eb||!bb?null:bb.ka}Mb(d,h,m){const u=Xa();if(u){jb(u.ob);const A=u.ka;if(A.width!==d||A.height!==h)A.width=d,A.height=h;if(u.ac!==d||u.Zb!==h)u.resize(d,h),u.ac=d,u.Zb=h;u.clear();gb||=new F.Mat2D;d=gb;for(const D of m)u.save(),D.sc&&u.saveClipRect(D.bc,D.cc,D.bc+D.Rl,D.cc+D.Nd),m=D.hd,d.xx=m[0],d.xy=m[1],d.yx=m[2],d.yy=m[3],d.tx=m[4],d.ty=m[5],u.transform(d),D.vd(u),D.sc&&u.restoreClipRect(),u.restore();u.flush()}}}const pb=new $a;
function ub(d,h,m,u,A,D){const G=new DOMMatrix;G.a=d;G.b=h;G.c=m;G.d=u;G.e=A;G.f=D;return G}const vb="createConicGradient createImageData createLinearGradient createPattern createRadialGradient getContextAttributes getImageData getLineDash getTransform isContextLost isPointInPath isPointInStroke measureText".split(" "),wb=F.onRuntimeInitialized;
F.onRuntimeInitialized=function(){function d(H){switch(H){case ca.srcOver:return"source-over";case ca.additive:return"lighter";case ca.screen:return"screen";case ca.overlay:return"overlay";case ca.darken:return"darken";case ca.lighten:return"lighten";case ca.colorDodge:return"color-dodge";case ca.colorBurn:return"color-burn";case ca.hardLight:return"hard-light";case ca.softLight:return"soft-light";case ca.difference:return"difference";case ca.exclusion:return"exclusion";case ca.multiply:return"multiply";
case ca.hue:return"hue";case ca.saturation:return"saturation";case ca.color:return"color";case ca.luminosity:return"luminosity"}}function h(H){return"rgba("+((16711680&H)>>>16)+","+((65280&H)>>>8)+","+((255&H)>>>0)+","+((4278190080&H)>>>24)/255+")"}function m(H,M,V,W,aa){return{Fc:H,Gc:M,jc:V,kc:W,type:aa,Qb:[],ea:null}}function u(H,M,V,W){if(M.oa===Aa&&!(0<M.pa))return null;V=1===V;return{Jb:H.Vb(V?M.rb:null),gradientTransform:V?M.xa:null,Pl:V?M.pa*M.vb:M.pa,fillRule:H.la===Na?"evenodd":"nonzero",
opacity:W,style:M.oa,color:M.mb,nc:M.O,rd:M.lb,join:M.sb,ld:M.kb}}function A(H,M){return M.oa!==Aa||0<M.pa?{path:H.Yc(H.la),Ib:M.Zc()}:null}function D(){if(0!==Ca.A.length){var H=Va();0!==H&&Ca.R.Mb(Math.min(Ca.$a.push(Ca.s.drawWidth()),H),Math.min(Ca.Z.push(Ca.s.drawHeight()),H),Ca.A)}for(const M of kb){for(const V of M.M)V();M.M=[]}kb.clear();for(const M of Ca.A)M.ie();Ca.A=[];Ca.s&&Ca.s.reset(512,512)}wb&&wb();var G=F.RenderPaintStyle,E=F.FillRule;const K=F.RenderPath,R=F.RenderPaint,X=F.Renderer,
Y=F.StrokeCap,U=F.StrokeJoin,la=F.StrokePosition,ca=F.BlendMode,wa=F.ImageFilter,Fa=F.ImageWrap,Pa=G.fill,Aa=G.stroke,Na=E.evenOdd,Wa=E.nonZero,Ca=pb,Ka=Ca.R;var Qa=F.RenderImage.extend("CanvasRenderImage",{__construct:function({Ea:H,eb:M}={}){this.__parent.__construct.call(this);this.Ea=H;this.eb=M;this.dd=this.qa=this.Na=this.qb=null},__destruct:function(){this.qa&&(this.qa.unref(),this.qa=null);this.Na&&URL.revokeObjectURL(this.Na);this.__parent.__destruct.call(this)},decode:function(H){var M=
this;M.eb&&M.eb(M);var V=new Image;M.Na=URL.createObjectURL(new Blob([H],{type:"image/png"}));V.onload=function(){M.qb=V;M.qa=F.adoptWebGL2Image(V,V.width,V.height);M.size(V.width,V.height);M.Ea&&M.Ea(M);F.onAssetChange&&F.onAssetChange()};V.src=M.Na}});class cb{constructor(H){this.s=H;this.path=new Path2D;this.A=null;this.Z=!1}R(){null!==this.A&&(this.path.lineTo(this.A.x,this.A.y),this.A=null)}moveTo(H,M){this.R();let V=H,W=M;null!==this.s&&(H=this.s.transformPoint({x:H,y:M}),V=H.x,W=H.y);this.path.moveTo(V,
W);this.A={x:V,y:W}}lineTo(H,M){this.A=null;null!==this.s?(H=this.s.transformPoint({x:H,y:M}),this.path.lineTo(H.x,H.y)):this.path.lineTo(H,M)}fc(H,M,V,W,aa,ea){this.A=null;null!==this.s?(H=this.s.transformPoint({x:H,y:M}),V=this.s.transformPoint({x:V,y:W}),aa=this.s.transformPoint({x:aa,y:ea}),this.path.bezierCurveTo(H.x,H.y,V.x,V.y,aa.x,aa.y)):this.path.bezierCurveTo(H,M,V,W,aa,ea)}close(){this.A=null;this.path.closePath()}addPath(H,M,V,W,aa,ea,ma){this.R();const ba=new cb(null);for(const Z of H)Z(ba);
ba.Wa();H=ub(M,V,W,aa,ea,ma);null!==this.s&&(H=this.s.multiply(H));this.path.addPath(ba.path,H)}Wa(){null===this.A||this.Z||(this.R(),this.Z=!0)}Oc(){return this.Z}dispose(){}}class rb{constructor(H){this.Vd=H;this.Z=this.R=0;this.A=null;this.s=H(null)}clear(){this.$a(null)}wb(H,M){for(((null===M?null!==this.A:null===this.A||this.A.a!==M.a||this.A.b!==M.b||this.A.c!==M.c||this.A.d!==M.d||this.A.e!==M.e||this.A.f!==M.f)||this.Z<H.length&&(0<this.R||this.s.Oc()))&&this.$a(M);this.Z<H.length;)H[this.Z++](this.s);
this.s.Wa();this.R++;return this.s.path}Lb(H){null!==this.s&&H===this.s.path&&this.R--}dispose(){this.s.dispose();this.s=null}$a(H){this.s.dispose();this.Z=this.R=0;this.A=H;this.s=this.Vd(H)}}var sb=K.extend("CanvasRenderPath",{__construct:function(){this.__parent.__construct.call(this);this.ma=[];this.Oa=new rb(H=>new cb(H));this.Pa=new rb(H=>new cb(H));this.na=new Map;this.la=Wa;this.pb=!1},__destruct:function(){this.Oa.dispose();this.Pa.dispose();for(const H of this.na.values())H.dispose();this.na.clear();
this.__parent.__destruct.call(this)},rewind:function(){this.ma.length=0;this.Oa.clear();this.Pa.clear();for(const H of this.na.values())H.clear();this.pb=!1},addPath:function(H,M,V,W,aa,ea,ma){const ba=H.ma.slice();this.wa(Z=>Z.addPath(ba,M,V,W,aa,ea,ma))},fillRule:function(H){this.la=H},moveTo:function(H,M){this.pb=!0;this.wa(V=>V.moveTo(H,M))},lineTo:function(H,M){this.Xb();this.wa(V=>V.lineTo(H,M))},cubicTo:function(H,M,V,W,aa,ea){this.Xb();this.wa(ma=>ma.fc(H,M,V,W,aa,ea))},close:function(){this.wa(H=>
H.close())},Xb:function(){this.pb||this.moveTo(0,0)},wa:function(H){this.ma.push(H)},Vb:function(H){H=null===H?this.Oa.wb(this.ma,null):this.Pa.wb(this.ma,H);H.ref&&H.ref();return H},Yc:function(H){var M=this.na.get(H);void 0===M&&(M=new rb(()=>new ob(H)),this.na.set(H,M));M=M.wb(this.ma,null);M.ref&&M.ref();return M},tb:function(H){this.Oa.Lb(H);this.Pa.Lb(H);for(const M of this.na.values())M.Lb(H);H.unref&&H.unref()}});const yb=m(0,0,0,0,0);var bc=R.extend("CanvasRenderPaint",{__construct:function(){this.__parent.__construct.call(this);
this.oa=Pa;this.mb=4278190080;this.pa=1;this.sb=U.miter;this.lb=Y.butt;this.ub=la.center;this.nb=0;this.kb=d(ca.srcOver);this.rb=this.D=this.xa=this.O=null;this.vb=1;this.F=0;this.ca=null;this.$b=-1},__destruct:function(){null!==this.ca&&(F.unrefWebGL2Paint(this.ca),this.ca=null);this.__parent.__destruct.call(this)},color:function(H){this.mb=H;this.O=null;this.F++},thickness:function(H){this.pa=Math.abs(H);this.F++},join:function(H){this.sb=H;this.F++},cap:function(H){this.lb=H;this.F++},strokePosition:function(H){this.ub=
H;this.F++},feather:function(H){this.nb=Math.abs(H);this.F++},style:function(H){this.oa=H;this.F++},blendMode:function(H){this.kb=d(H);this.F++},clearGradient:function(){this.O=null;this.F++},linearGradient:function(H,M,V,W){this.O=m(H,M,V,W,0);this.F++},radialGradient:function(H,M,V,W){this.O=m(H,M,V,W,1);this.F++},angularGradient:function(){this.O=m(0,0,0,0,2);this.F++},addStop:function(H,M){this.O.Qb.push({color:H,stop:M});this.O.ea=null;this.F++},modulatedImage:function(H,M,V,W,aa,ea,ma,ba,Z,
va){const q=H?H.qb:null;if(q){H=H.qa;var a=this.D;if(null===a||a.image!==q||a.Ub!==H||a.filter!==M||a.Qc!==V||a.Rc!==W||a.Tc!==aa||a.Uc!==ea||a.Vc!==ma||a.Wc!==ba||a.Ic!==Z||a.Jc!==va)null===a&&(a=this.D={}),a.image=q,a.Ub=H,a.filter=M,a.Qc=V,a.Rc=W,a.Tc=aa,a.Uc=ea,a.Vc=ma,a.Wc=ba,a.Ic=Z,a.Jc=va,this.F++}else null!==this.D&&(this.D=null,this.F++)},completeGradient:function(){},_setGradientTransform:function(H,M,V,W,aa,ea,ma,ba,Z,va,q,a,f){1===H&&0===M&&0===V&&1===W&&0===aa&&0===ea?this.rb=this.xa=
null:(this.xa=ub(H,M,V,W,aa,ea),this.rb=ub(ma,ba,Z,va,q,a));this.vb=f;this.F++},Zc:function(){if(this.$b!==this.F){null!==this.ca&&F.unrefWebGL2Paint(this.ca);const M=null!==this.O?this.O:yb;let V=null,W=null;if(null!==this.O){var H=M.Qb;V=new Uint32Array(H.length);W=new Float32Array(H.length);for(let g=0,l=H.length;g<l;g++)V[g]=H[g].color,W[g]=H[g].stop}H=null;let aa=wa.bilinear,ea=Fa.clamp,ma=Fa.clamp,ba=1,Z=0,va=0,q=1,a=0,f=0;null!==this.D&&(H=this.D.Ub,aa=this.D.filter,ea=this.D.Qc,ma=this.D.Rc,
ba=this.D.Tc,Z=this.D.Uc,va=this.D.Vc,q=this.D.Wc,a=this.D.Ic,f=this.D.Jc);let c=1,n=0,p=0,t=1,k=0,b=0;const e=this.xa;null!==e&&(c=e.a,n=e.b,p=e.c,t=e.d,k=e.e,b=e.f);this.ca=F.makeWebGL2Paint(this.oa,this.mb,this.pa,this.sb,this.lb,this.ub,this.nb,V,W,M.type,M.Fc,M.Gc,M.jc,M.kc,c,n,p,t,k,b,H,aa,ea,ma,ba,Z,va,q,a,f);this.$b=this.F}F.refWebGL2Paint(this.ca);return this.ca}});const kb=new Set,cc=Object.prototype.hasOwnProperty;var Ac=F.CanvasRenderer=X.extend("Renderer",{__construct:function(H){this.__parent.__construct.call(this);
this.V=[1,0,0,1,0,0];this.L=[1];this.C=H.getContext("2d");this.ka=H;this.M=[]},save:function(){this.V.push(...this.V.slice(this.V.length-6));this.L.push(this.L[this.L.length-1]);this.M.push(this.C.save.bind(this.C))},restore:function(){const H=this.V.length-6;if(6>H)throw"restore() called without matching save().";this.V.splice(H);this.L.pop();this.M.push(this.C.restore.bind(this.C))},transform:function(H,M,V,W,aa,ea){const ma=this.V,ba=ma.length-6;ma.splice(ba,6,ma[ba]*H+ma[ba+2]*M,ma[ba+1]*H+ma[ba+
3]*M,ma[ba]*V+ma[ba+2]*W,ma[ba+1]*V+ma[ba+3]*W,ma[ba]*aa+ma[ba+2]*ea+ma[ba+4],ma[ba+1]*aa+ma[ba+3]*ea+ma[ba+5]);this.M.push(this.C.transform.bind(this.C,H,M,V,W,aa,ea))},rotate:function(H){const M=Math.sin(H);H=Math.cos(H);this.transform(H,M,-M,H,0,0)},modulateOpacity:function(H){this.L[this.L.length-1]*=H},_drawPath:function(H,M){const V=Math.max(0,this.L[this.L.length-1]),W=M.D||M.ub!==la.center&&Ka.Rb?2:0!==M.nb?Ka.Rb?2:0:null===M.O||null===M.xa?0:M.oa!==Aa||0<M.vb?1:Ka.Rb?2:0;if(2===W)(null===
M.D||M.D.Ub)&&this.$c(H,M,V);else{var aa=u(H,M,W,V);null!==aa&&this.M.push(()=>{var ea=this.C;const ma=ea.globalCompositeOperation,ba=ea.globalAlpha;ea.globalCompositeOperation=aa.ld;ea.globalAlpha=aa.opacity;if(null!==aa.nc){var Z=aa.nc;if(null===Z.ea){var va=Z.Fc;const f=Z.Gc;var q=Z.jc,a=Z.kc;0==Z.type?Z.ea=ea.createLinearGradient(va,f,q,a):1==Z.type?(q-=va,a-=f,Z.ea=ea.createRadialGradient(va,f,0,va,f,Math.sqrt(q*q+a*a))):Z.ea=ea.createConicGradient(0,0,0);va=Z.Qb;for(let c=0,n=va.length;c<n;c++)Z.ea.addColorStop(va[c].stop,
h(va[c].color))}Z=Z.ea}else Z=h(aa.color);null!==aa.gradientTransform&&(ea.save(),ea.transform(aa.gradientTransform.a,aa.gradientTransform.b,aa.gradientTransform.c,aa.gradientTransform.d,aa.gradientTransform.e,aa.gradientTransform.f));switch(aa.style){case Aa:ea.strokeStyle=Z;ea.lineWidth=aa.Pl;a:{switch(aa.rd){case Y.butt:Z="butt";break a;case Y.round:Z="round";break a;case Y.square:Z="square";break a}Z=void 0}ea.lineCap=Z;a:{switch(aa.join){case U.miter:Z="miter";break a;case U.round:Z="round";
break a;case U.bevel:Z="bevel";break a}Z=void 0}ea.lineJoin=Z;ea.miterLimit=4;ea.stroke(aa.Jb);break;case Pa:ea.fillStyle=Z,ea.fill(aa.Jb,aa.fillRule)}null!==aa.gradientTransform&&ea.restore();ea.globalCompositeOperation=ma;ea.globalAlpha=ba;H.tb(aa.Jb)})}},$c:function(H,M,V){const W=A(H,M);if(null!==W){var aa=this.V.slice(this.V.length-6);M=Ya(Ca,this.C,this.C.canvas.width,this.C.canvas.height,aa,M.kb,V,(ea,ma,ba)=>F.webGL2PathPixelBounds(W.path,W.Ib,ea*aa[0],ma*aa[1],ea*aa[2],ma*aa[3],ea*aa[4],
ma*aa[5],ba),ea=>ea.drawPath(W.path,W.Ib),()=>{H.tb(W.path);F.unrefWebGL2Paint(W.Ib)},D);kb.add(this);this.M.push(M)}},_drawRiveImage:function(H,M,V){var W=H.qb;if(W){var aa=this.C,ea=d(M),ma=Math.max(0,V*this.L[this.L.length-1]);this.M.push(function(){aa.globalCompositeOperation=ea;aa.globalAlpha=ma;aa.drawImage(W,0,0);aa.globalAlpha=1})}},_getMatrix:function(H){const M=this.V,V=M.length-6;for(let W=0;6>W;++W)H[W]=M[V+W]},_drawImageMesh:function(H,M,V,W,aa,ea,ma,ba){const Z=H.qa;Z?this.Wb(V,W,aa,
ea,ma,ba,va=>F.drawWebGL2PendingMesh(va,M,Z),()=>M.unref()):M.unref()},_drawImageMeshFromHeap:function(H,M,V,W,aa,ea,ma,ba,Z,va,q,a,f){if(H.dd){try{var c=F.HEAPF32.slice(W>>2,(W>>2)+aa);var n=F.HEAPF32.slice(ea>>2,(ea>>2)+ma);var p=F.HEAPU16.slice(ba>>1,(ba>>1)+Z)}catch(t){console.error("[Rive] _drawImageMesh: failed to read mesh data from WASM heap. Mesh skipped for this frame.");return}this.Wb(M,V,va,q,a,f,{image:H,bm:c,am:n,indices:p},()=>{})}},Wb:function(H,M,V,W,aa,ea,ma,ba){H=Ya(Ca,this.C,this.C.canvas.width,
this.C.canvas.height,this.V.slice(this.V.length-6),d(H),Math.max(0,M*this.L[this.L.length-1]),(Z,va,q)=>{q[0]=Math.floor(V*Z);q[1]=Math.floor(W*va);q[2]=Math.ceil(aa*Z);q[3]=Math.ceil(ea*va)},ma,ba,D);kb.add(this);this.M.push(H)},_clipPath:function(H){const M=H.la===Na?"evenodd":"nonzero",V=H.Vb(null);this.M.push(()=>{this.C.clip(V,M);H.tb(V)})},beginFrame:function(H=!0){kb.add(this);H&&this.M.push(this.C.clearRect.bind(this.C,0,0,this.ka.width,this.ka.height))},clear:function(){this.beginFrame(!0)},
flush:function(){},translate:function(H,M){this.transform(1,0,0,1,H,M)}});F.makeRenderer=function(H){const M=new Ac(H),V=M.C;let W=null,aa=null;const ea={attachSession:function(ba){if(ba&&W===ba)return!0;if(!ba||W||"function"!==typeof F.c2dDeferredClaim||"function"!==typeof F.c2dDeferredRenderer||!F.c2dDeferredClaim(ba))return!1;const Z=F.c2dDeferredRenderer(ba);if(!Z)return!1;W=ba;aa=Z;return!0},detachSession:function(){W&&F.c2dDeferredDetach(W);aa=W=null},deferredActive:function(){return null!==
aa}},ma={save:function(){F.c2dDeferredSave(W)},restore:function(){F.c2dDeferredRestore(W)},transform:function(ba,Z,va,q,a,f){F.c2dDeferredTransform(W,ba,Z,va,q,a,f)},translate:function(ba,Z){F.c2dDeferredTransform(W,1,0,0,1,ba,Z)},rotate:function(ba){const Z=Math.sin(ba);ba=Math.cos(ba);F.c2dDeferredTransform(W,ba,Z,-Z,ba,0,0)},align:function(ba,Z,va,q,a){F.c2dDeferredAlign(W,ba,Z,va.minX,va.minY,va.maxX,va.maxY,q.minX,q.minY,q.maxX,q.maxY,void 0===a?1:a)},beginFrame:function(ba=!0){M.beginFrame(ba);
F.c2dDeferredBeginFrame(W)},clear:function(){M.beginFrame(!0);F.c2dDeferredBeginFrame(W)},flush:function(){F.c2dDeferredReplay(W,M)}};return new Proxy(M,{get(ba,Z){if(cc.call(ea,Z))return ea[Z];if("_deferredRecorder"===Z)return aa;if(null!==aa&&cc.call(ma,Z))return ma[Z];if("function"===typeof ba[Z])return function(...va){return ba[Z].apply(ba,va)};if("function"===typeof V[Z]){if(-1<vb.indexOf(Z))throw Error("RiveException: Method call to '"+Z+"()' is not allowed, as the renderer cannot immediately pass through the return                 values of any canvas 2d context methods.");
return function(...va){M.M.push(V[Z].bind(V,...va))}}return ba[Z]},set(ba,Z,va){if(Z in V)return M.M.push(()=>{V[Z]=va}),!0}})};F.decodeImage=function(H,M){(new Qa({Ea:M})).decode(H)};F.renderFactory={makeRenderPaint:function(){return new bc},makeRenderPath:function(){return new sb},makeRenderImage:function(){let H=tb;return new Qa({eb:()=>{H.total++},Ea:()=>{H.loaded++;if(H.loaded===H.total){const M=H.ready;M&&(M(),H.ready=null)}}})}};let Bc=F.load,tb=null;F.load=function(H,M,V=!0,W=null,aa=!1){const ea=
new F.FallbackFileAssetLoader;void 0!==M&&ea.addLoader(M);V&&(M=new F.CDNFileAssetLoader(W),ea.addLoader(M));return(new Promise(function(ma){let ba=null;tb={total:0,loaded:0,ready:function(){ma(ba)}};ba=Bc(H,ea,W??null,!!aa);const Z=F.riveScripting;Z&&Z.prepare();0==tb.total&&ma(ba)})).then(F.startFileScripts)};const Ib=F.Artboard.prototype.draw;F.Artboard.prototype.draw=function(H){Ib.call(this,H._deferredRecorder||H)};let dc=F.RendererWrapper.prototype.align;F.RendererWrapper.prototype.align=function(H,
M,V,W,aa=1){dc.call(this,H,M,V,W,aa)};G=new za;F.requestAnimationFrame=G.requestAnimationFrame.bind(G);F.cancelAnimationFrame=G.cancelAnimationFrame.bind(G);F.enableFPSCounter=G.Bd.bind(G);F.disableFPSCounter=G.yd;E=Ha(D);G.tc=E;F.resolveAnimationFrame=E;F.cleanup=function(){Ca.s&&(Ca.s["delete"](),Ca.s=null)}};var Bb="./this.program";ta&&(_scriptName=self.location.href);var Cb="",Db,Eb;
if(na||ta){try{Cb=(new URL(".",_scriptName)).href}catch{}ta&&(Eb=d=>{var h=new XMLHttpRequest;h.open("GET",d,!1);h.responseType="arraybuffer";h.send(null);return new Uint8Array(h.response)});Db=async d=>{if(Fb(d))return new Promise((m,u)=>{var A=new XMLHttpRequest;A.open("GET",d,!0);A.responseType="arraybuffer";A.onload=()=>{200==A.status||0==A.status&&A.response?m(A.response):u(A.status)};A.onerror=u;A.send(null)});var h=await fetch(d,{credentials:"same-origin"});if(h.ok)return h.arrayBuffer();throw Error(h.status+
" : "+h.url);}}var Mb=console.log.bind(console),Nb=console.error.bind(console),Ob,Pb=!1,Fb=d=>d.startsWith("file://"),Qb,Rb,Sb,Tb,Ub,Vb,Wb,Xb,Yb,Zb,$b=!1;function hc(){var d=ic.buffer;F.HEAP8=Sb=new Int8Array(d);Ub=new Int16Array(d);F.HEAPU8=Tb=new Uint8Array(d);F.HEAPU16=Vb=new Uint16Array(d);F.HEAP32=Wb=new Int32Array(d);F.HEAPU32=Xb=new Uint32Array(d);F.HEAPF32=Yb=new Float32Array(d);Zb=new Float64Array(d)}
function jc(d){F.onAbort?.(d);d="Aborted("+d+")";Nb(d);Pb=!0;d=new WebAssembly.RuntimeError(d+". Build with -sASSERTIONS for more info.");Rb?.(d);throw d;}var kc;async function lc(d){if(!Ob)try{var h=await Db(d);return new Uint8Array(h)}catch{}if(d==kc&&Ob)d=new Uint8Array(Ob);else if(Eb)d=Eb(d);else throw"both async and sync fetching of the wasm failed";return d}
async function mc(d,h){try{var m=await lc(d);return await WebAssembly.instantiate(m,h)}catch(u){Nb(`failed to asynchronously prepare wasm: ${u}`),jc(u)}}async function nc(d){var h=kc;if(!Ob&&!Fb(h))try{var m=fetch(h,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(m,d)}catch(u){Nb(`wasm streaming compile failed: ${u}`),Nb("falling back to ArrayBuffer instantiation")}return mc(h,d)}
var oc,pc,qc=d=>{for(;0<d.length;)d.shift()(F)},rc=[],sc=[],tc=()=>{var d=F.preRun.shift();sc.push(d)},vc=d=>uc(d),xc=()=>wc(),yc=globalThis.TextDecoder&&new TextDecoder,zc=(d,h,m,u)=>{m=h+m;if(u)return m;for(;d[h]&&!(h>=m);)++h;return h},Hc=(d,h=0,m,u)=>{m=zc(d,h,m,u);if(16<m-h&&d.buffer&&yc)return yc.decode(d.subarray(h,m));for(u="";h<m;){var A=d[h++];if(A&128){var D=d[h++]&63;if(192==(A&224))u+=String.fromCharCode((A&31)<<6|D);else{var G=d[h++]&63;A=224==(A&240)?(A&15)<<12|D<<6|G:(A&7)<<18|D<<
12|G<<6|d[h++]&63;65536>A?u+=String.fromCharCode(A):(A-=65536,u+=String.fromCharCode(55296|A>>10,56320|A&1023))}}else u+=String.fromCharCode(A)}return u},Ic=(d,h)=>Object.defineProperty(h,"name",{value:d}),Jc=[],Kc=[0,1,,1,null,1,!0,1,!1,1],Lc=class extends Error{constructor(d){super(d);this.name="BindingError"}},Mc=d=>{if(!d)throw new Lc(`Cannot use deleted val. handle = ${d}`);return Kc[d]},Nc=d=>{switch(d){case void 0:return 2;case null:return 4;case !0:return 6;case !1:return 8;default:const h=
Jc.pop()||Kc.length;Kc[h]=d;Kc[h+1]=1;return h}};class Oc extends Error{}
var Pc=d=>{for(var h="";;){var m=Tb[d++];if(!m)return h;h+=String.fromCharCode(m)}},Qc={},Rc=(d,h)=>{if(void 0===h)throw new Lc("ptr should not be undefined");for(;d.I;)h=d.Ka(h),d=d.I;return h},Sc={},Vc=d=>{d=Tc(d);var h=Pc(d);Uc(d);return h},Wc=(d,h)=>{var m=Sc[d];if(void 0===m)throw d=`${h} has unknown type ${Vc(d)}`,new Lc(d);return m},Xc=()=>{},Yc=!1,Zc=d=>{if(!globalThis.FinalizationRegistry)return Zc=h=>h,d;Yc=new FinalizationRegistry(h=>{h=h.m;--h.count.value;0===h.count.value&&(h.J?h.T.$(h.J):
h.B.o.$(h.v))});Zc=h=>{var m=h.m;m.J&&Yc.register(h,{m},h);return h};Xc=h=>{Yc.unregister(h)};return Zc(d)},$c={},ad=d=>{for(;d.length;){var h=d.pop();d.pop()(h)}};function bd(d){return this.u(Xb[d>>2])}
var cd={},dd={},ed=class extends Error{constructor(d){super(d);this.name="InternalError"}},gd=(d,h,m)=>{function u(E){E=m(E);if(E.length!==d.length)throw new ed("Mismatched type converter count");for(var K=0;K<d.length;++K)fd(d[K],E[K])}d.forEach(E=>dd[E]=h);var A=Array(h.length),D=[],G=0;for(let [E,K]of h.entries())Sc.hasOwnProperty(K)?A[E]=Sc[K]:(D.push(K),cd.hasOwnProperty(K)||(cd[K]=[]),cd[K].push(()=>{A[E]=Sc[K];++G;G===D.length&&u(A)}));0===D.length&&u(A)};
function hd(d,h,m={}){var u=h.name;if(!d)throw new Lc(`type "${u}" must have a positive integer typeid pointer`);if(Sc.hasOwnProperty(d)){if(m.Qd)return;throw new Lc(`Cannot register type '${u}' twice`);}Sc[d]=h;delete dd[d];cd.hasOwnProperty(d)&&(h=cd[d],delete cd[d],h.forEach(A=>A()))}function fd(d,h,m={}){return hd(d,h,m)}var pd=d=>{throw new Lc(d.m.B.o.name+" instance already deleted");},qd=[];function rd(){}
var sd={},td=(d,h,m)=>{if(void 0===d[h].G){var u=d[h];d[h]=function(...A){if(!d[h].G.hasOwnProperty(A.length))throw new Lc(`Function '${m}' called with an invalid number of arguments (${A.length}) - expects one of (${d[h].G})!`);return d[h].G[A.length].apply(this,A)};d[h].G=[];d[h].G[u.ba]=u}},ud=(d,h,m)=>{if(F.hasOwnProperty(d)){if(void 0===m||void 0!==F[d].G&&void 0!==F[d].G[m])throw new Lc(`Cannot register public name '${d}' twice`);td(F,d,d);if(F[d].G.hasOwnProperty(m))throw new Lc(`Cannot register multiple overloads of a function with the same number of arguments (${m})!`);
F[d].G[m]=h}else F[d]=h,F[d].ba=m},vd=d=>{d=d.replace(/[^a-zA-Z0-9_]/g,"$");var h=d.charCodeAt(0);return 48<=h&&57>=h?`_${d}`:d};function wd(d,h,m,u,A,D,G,E){this.name=d;this.constructor=h;this.Y=m;this.$=u;this.I=A;this.Hd=D;this.Ka=G;this.zd=E;this.xc=[]}
var xd=(d,h,m)=>{for(;h!==m;){if(!h.Ka)throw new Lc(`Expected null or instance of ${m.name}, got an instance of ${h.name}`);d=h.Ka(d);h=h.I}return d},yd=d=>{if(null===d)return"null";var h=typeof d;return"object"===h||"array"===h||"function"===h?d.toString():""+d};
function zd(d,h){if(null===h){if(this.Bb)throw new Lc(`null is not a valid ${this.name}`);return 0}if(!h.m)throw new Lc(`Cannot pass "${yd(h)}" as a ${this.name}`);if(!h.m.v)throw new Lc(`Cannot pass deleted object as a pointer of type ${this.name}`);return xd(h.m.v,h.m.B.o,this.o)}
function Ad(d,h){if(null===h){if(this.Bb)throw new Lc(`null is not a valid ${this.name}`);if(this.Za){var m=this.Kb();null!==d&&d.push(this.$,m);return m}return 0}if(!h||!h.m)throw new Lc(`Cannot pass "${yd(h)}" as a ${this.name}`);if(!h.m.v)throw new Lc(`Cannot pass deleted object as a pointer of type ${this.name}`);if(!this.Ya&&h.m.B.Ya)throw new Lc(`Cannot convert argument of type ${h.m.T?h.m.T.name:h.m.B.name} to parameter type ${this.name}`);m=xd(h.m.v,h.m.B.o,this.o);if(this.Za){if(void 0===
h.m.J)throw new Lc("Passing raw pointer to smart pointer is illegal");switch(this.Ml){case 0:if(h.m.T===this)m=h.m.J;else throw new Lc(`Cannot convert argument of type ${h.m.T?h.m.T.name:h.m.B.name} to parameter type ${this.name}`);break;case 1:m=h.m.J;break;case 2:if(h.m.T===this)m=h.m.J;else{var u=h.clone();m=this.he(m,Nc(()=>u["delete"]()));null!==d&&d.push(this.$,m)}break;default:throw new Lc("Unsupported sharing policy");}}return m}
function Bd(d,h){if(null===h){if(this.Bb)throw new Lc(`null is not a valid ${this.name}`);return 0}if(!h.m)throw new Lc(`Cannot pass "${yd(h)}" as a ${this.name}`);if(!h.m.v)throw new Lc(`Cannot pass deleted object as a pointer of type ${this.name}`);if(h.m.B.Ya)throw new Lc(`Cannot convert argument of type ${h.m.B.name} to parameter type ${this.name}`);return xd(h.m.v,h.m.B.o,this.o)}
var Cd=(d,h,m)=>{if(h===m)return d;if(void 0===m.I)return null;d=Cd(d,h,m.I);return null===d?null:m.zd(d)},Dd=(d,h)=>{h=Rc(d,h);return Qc[h]},Ed=(d,h)=>{if(!h.B||!h.v)throw new ed("makeClassHandle requires ptr and ptrType");if(!!h.T!==!!h.J)throw new ed("Both smartPtrType and smartPtr must be specified");h.count={value:1};return Zc(Object.create(d,{m:{value:h,writable:!0}}))};
function Fd(d,h,m,u,A,D,G,E,K,R,X){this.name=d;this.o=h;this.Bb=m;this.Ya=u;this.Za=A;this.ce=D;this.Ml=G;this.zc=E;this.Kb=K;this.he=R;this.$=X;A||void 0!==h.I?this.H=Ad:(this.H=u?zd:Bd,this.N=null)}
var Gd=(d,h,m)=>{if(!F.hasOwnProperty(d))throw new ed("Replacing nonexistent public symbol");void 0!==F[d].G&&void 0!==m?F[d].G[m]=h:(F[d]=h,F[d].ba=m)},Hd={},Jd=(d,h,m=[])=>{d.includes("j")?(d=d.replace(/p/g,"i"),h=(0,Hd[d])(h,...m)):h=Id.get(h)(...m);return h},Kd=(d,h)=>(...m)=>Jd(d,h,m),Ld=(d,h)=>{d=Pc(d);var m=d.includes("j")?Kd(d,h):Id.get(h);if("function"!=typeof m)throw new Lc(`unknown function pointer with signature ${d}: ${h}`);return m};class Md extends Error{}
var Nd=(d,h)=>{function m(D){A[D]||Sc[D]||(dd[D]?dd[D].forEach(m):(u.push(D),A[D]=!0))}var u=[],A={};h.forEach(m);throw new Md(`${d}: `+u.map(Vc).join([", "]));};function Od(d){for(var h=1;h<d.length;++h)if(null!==d[h]&&void 0===d[h].N)return!0;return!1}
function Pd(d,h,m,u,A){var D=h.length;if(2>D)throw new Lc("argTypes array size mismatch! Must at least get return value and 'this' types!");var G=null!==h[1]&&null!==m,E=Od(h),K=!h[0].Sd,R=D-2,X=Array(R),Y=[],U=[];return Ic(d,function(...la){U.length=0;Y.length=G?2:1;Y[0]=A;if(G){var ca=h[1].H(U,this);Y[1]=ca}for(var wa=0;wa<R;++wa)X[wa]=h[wa+2].H(U,la[wa]),Y.push(X[wa]);la=u(...Y);if(E)ad(U);else for(wa=G?1:2;wa<h.length;wa++){var Fa=1===wa?ca:X[wa-2];null!==h[wa].N&&h[wa].N(Fa)}ca=K?h[0].u(la):
void 0;return ca})}
var Qd=(d,h)=>{for(var m=[],u=0;u<d;u++)m.push(Xb[h+4*u>>2]);return m},Rd=d=>{d=d.trim();const h=d.indexOf("(");return-1===h?d:d.slice(0,h)},Sd=(d,h,m)=>{if(!(d instanceof Object))throw new Lc(`${m} with invalid "this": ${d}`);if(!(d instanceof h.o.constructor))throw new Lc(`${m} incompatible with "this" of type ${d.constructor.name}`);if(!d.m.v)throw new Lc(`cannot call emscripten binding method ${m} on deleted object`);return xd(d.m.v,d.m.B.o,h.o)},Td=d=>{9<d&&0===--Kc[d+1]&&(Kc[d]=void 0,Jc.push(d))},
Ud={name:"emscripten::val",u:d=>{var h=Mc(d);Td(d);return h},H:(d,h)=>Nc(h),S:bd,N:null},Vd=(d,h,m)=>{switch(h){case 1:return m?function(u){return this.u(Sb[u])}:function(u){return this.u(Tb[u])};case 2:return m?function(u){return this.u(Ub[u>>1])}:function(u){return this.u(Vb[u>>1])};case 4:return m?function(u){return this.u(Wb[u>>2])}:function(u){return this.u(Xb[u>>2])};default:throw new TypeError(`invalid integer width (${h}): ${d}`);}},Wd=(d,h)=>{switch(h){case 4:return function(m){return this.u(Yb[m>>
2])};case 8:return function(m){return this.u(Zb[m>>3])};default:throw new TypeError(`invalid float width (${h}): ${d}`);}},Xd=(d,h,m)=>{switch(h){case 1:return m?u=>Sb[u]:u=>Tb[u];case 2:return m?u=>Ub[u>>1]:u=>Vb[u>>1];case 4:return m?u=>Wb[u>>2]:u=>Xb[u>>2];default:throw new TypeError(`invalid integer width (${h}): ${d}`);}},Yd=(d,h,m)=>{var u=Tb;if(!(0<m))return 0;var A=h;m=h+m-1;for(var D=0;D<d.length;++D){var G=d.codePointAt(D);if(127>=G){if(h>=m)break;u[h++]=G}else if(2047>=G){if(h+1>=m)break;
u[h++]=192|G>>6;u[h++]=128|G&63}else if(65535>=G){if(h+2>=m)break;u[h++]=224|G>>12;u[h++]=128|G>>6&63;u[h++]=128|G&63}else{if(h+3>=m)break;u[h++]=240|G>>18;u[h++]=128|G>>12&63;u[h++]=128|G>>6&63;u[h++]=128|G&63;D++}}u[h]=0;return h-A},Zd=d=>{for(var h=0,m=0;m<d.length;++m){var u=d.charCodeAt(m);127>=u?h++:2047>=u?h+=2:55296<=u&&57343>=u?(h+=4,++m):h+=3}return h},$d=globalThis.TextDecoder?new TextDecoder("utf-16le"):void 0,ae=(d,h,m)=>{d>>=1;h=zc(Vb,d,h/2,m);if(16<h-d&&$d)return $d.decode(Vb.subarray(d,
h));for(m="";d<h;++d)m+=String.fromCharCode(Vb[d]);return m},be=(d,h,m)=>{m??=2147483647;if(2>m)return 0;m-=2;var u=h;m=m<2*d.length?m/2:d.length;for(var A=0;A<m;++A)Ub[h>>1]=d.charCodeAt(A),h+=2;Ub[h>>1]=0;return h-u},ce=d=>2*d.length,de=(d,h,m)=>{var u="";d>>=2;for(var A=0;!(A>=h/4);A++){var D=Xb[d+A];if(!D&&!m)break;u+=String.fromCodePoint(D)}return u},ee=(d,h,m)=>{m??=2147483647;if(4>m)return 0;var u=h;m=u+m-4;for(var A=0;A<d.length;++A){var D=d.codePointAt(A);65535<D&&A++;Wb[h>>2]=D;h+=4;if(h+
4>m)break}Wb[h>>2]=0;return h-u},fe=d=>{for(var h=0,m=0;m<d.length;++m)65535<d.codePointAt(m)&&m++,h+=4;return h},ge=[],he=d=>{var h=ge.length;ge.push(d);return h},ie=(d,h)=>{for(var m=Array(d),u=0;u<d;++u)m[u]=Wc(Xb[h+4*u>>2],`parameter ${u}`);return m},je={},ke=d=>{var h=je[d];return void 0===h?Pc(d):h},le=[0,31,60,91,121,152,182,213,244,274,305,335],me=[0,31,59,90,120,151,181,212,243,273,304,334],ne=[],oe=d=>{d.Tl=d.getExtension("WEBGL_draw_instanced_base_vertex_base_instance")},pe=d=>{d.Xl=d.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance")},
P,qe=d=>{var h="EXT_color_buffer_float EXT_conservative_depth EXT_disjoint_timer_query_webgl2 EXT_texture_norm16 NV_shader_noperspective_interpolation WEBGL_clip_cull_distance EXT_clip_control EXT_color_buffer_half_float EXT_depth_clamp EXT_float_blend EXT_polygon_offset_clamp EXT_texture_compression_bptc EXT_texture_compression_rgtc EXT_texture_filter_anisotropic KHR_parallel_shader_compile OES_texture_float_linear WEBGL_blend_func_extended WEBGL_compressed_texture_astc WEBGL_compressed_texture_etc WEBGL_compressed_texture_etc1 WEBGL_compressed_texture_s3tc WEBGL_compressed_texture_s3tc_srgb WEBGL_debug_renderer_info WEBGL_debug_shaders WEBGL_lose_context WEBGL_multi_draw WEBGL_polygon_mode".split(" ");
return(d.getSupportedExtensions()||[]).filter(m=>h.includes(m))},re=1,se=[],te=[],ue=[],ve=[],we=[],xe=[],ye=[],De=[],Ee=[],Fe=[],Ge={},He=4,Ie=0,Je=d=>{for(var h=re++,m=d.length;m<h;m++)d[m]=null;return h},Le=(d,h,m,u)=>{for(var A=0;A<d;A++){var D=P[m](),G=D&&Je(u);D?(D.name=G,u[G]=D):Ke||=1282;Wb[h+4*A>>2]=G}},ib=(d,h)=>{var m=Je(De),u={handle:m,attributes:h,version:h.Wl,K:d};d.canvas&&(d.canvas.Xc=u);De[m]=u;if("undefined"==typeof h.Ad||h.Ad)if((d=u)||(d=Me),!d.Rd){d.Rd=!0;h=d.K;h.Xd=h.getExtension("WEBGL_multi_draw");
h.Dd=h.getExtension("EXT_polygon_offset_clamp");h.Cd=h.getExtension("EXT_clip_control");h.Ql=h.getExtension("WEBGL_polygon_mode");oe(h);pe(h);2<=d.version&&(h.ic=h.getExtension("EXT_disjoint_timer_query_webgl2"));if(2>d.version||!h.ic)h.ic=h.getExtension("EXT_disjoint_timer_query");for(var A of qe(h))A.includes("lose_context")||A.includes("debug")||h.getExtension(A)}return m},jb=d=>{Me=De[d];F.ctx=P=Me?.K;return!(d&&!P)},mb=d=>{Me===De[d]&&(Me=null);"object"==typeof JSEvents&&JSEvents.$l(De[d].K.canvas);
De[d]?.K.canvas&&(De[d].K.canvas.Xc=void 0);De[d]=null},Ke,Me,Ne={},Pe=()=>{if(!Oe){var d={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:Bb||"./this.program"},h;for(h in Ne)void 0===Ne[h]?delete d[h]:d[h]=Ne[h];var m=[];for(h in d)m.push(`${h}=${d[h]}`);Oe=m}return Oe},Oe,Qe=[null,[],[]],Re=[],Se=()=>{var d=qe(P);return d=d.concat(d.map(h=>"GL_"+h))},Te=(d,h)=>{if(h){var m=void 0;switch(d){case 36346:m=
1;break;case 36344:return;case 34814:case 36345:m=0;break;case 34466:var u=P.getParameter(34467);m=u?u.length:0;break;case 33309:if(2>Me.version){Ke||=1282;return}m=Se().length;break;case 33307:case 33308:if(2>Me.version){Ke||=1280;return}m=33307==d?3:0}if(void 0===m)switch(u=P.getParameter(d),typeof u){case "number":m=u;break;case "boolean":m=u?1:0;break;case "string":Ke||=1280;return;case "object":if(null===u)switch(d){case 34964:case 35725:case 34965:case 36006:case 36007:case 32873:case 34229:case 36662:case 36663:case 35053:case 35055:case 36010:case 35097:case 35869:case 32874:case 36389:case 35983:case 35368:case 34068:m=
0;break;default:Ke||=1280;return}else{if(u instanceof Float32Array||u instanceof Uint32Array||u instanceof Int32Array||u instanceof Array){for(d=0;d<u.length;++d)Wb[h+4*d>>2]=u[d];return}try{m=u.name|0}catch(A){Ke||=1280;Nb(`GL_INVALID_ENUM in glGet${0}v: Unknown object returned from WebGL getParameter(${d})! (error: ${A})`);return}}break;default:Ke||=1280;Nb(`GL_INVALID_ENUM in glGet${0}v: Native code calling glGet${0}v(${d}) and it returns ${u} of type ${typeof u}!`);return}Wb[h>>2]=m}else Ke||=
1281},Ve=d=>{var h=Zd(d)+1,m=Ue(h);m&&Yd(d,m,h);return m},We=d=>"]"==d.slice(-1)&&d.lastIndexOf("["),Xe=d=>{d-=5120;return 0==d?Sb:1==d?Tb:2==d?Ub:4==d?Wb:6==d?Yb:5==d||28922==d||28520==d||30779==d||30782==d?Xb:Vb},Ye=(d,h,m,u,A)=>{d=Xe(d);h=u*((Ie||m)*({5:3,6:4,8:2,29502:3,29504:4,26917:2,26918:2,29846:3,29847:4}[h-6402]||1)*d.BYTES_PER_ELEMENT+He-1&-He);return d.subarray(A>>>31-Math.clz32(d.BYTES_PER_ELEMENT),A+h>>>31-Math.clz32(d.BYTES_PER_ELEMENT))},$e=d=>Ze(d);
(()=>{let d=rd.prototype;Object.assign(d,{isAliasOf:function(m){if(!(this instanceof rd&&m instanceof rd))return!1;var u=this.m.B.o,A=this.m.v;m.m=m.m;var D=m.m.B.o;for(m=m.m.v;u.I;)A=u.Ka(A),u=u.I;for(;D.I;)m=D.Ka(m),D=D.I;return u===D&&A===m},clone:function(){this.m.v||pd(this);if(this.m.ta)return this.m.count.value+=1,this;var m=Zc,u=Object,A=u.create,D=Object.getPrototypeOf(this),G=this.m;m=m(A.call(u,D,{m:{value:{count:G.count,za:G.za,ta:G.ta,v:G.v,B:G.B,J:G.J,T:G.T}}}));m.m.count.value+=1;m.m.za=
!1;return m},["delete"](){this.m.v||pd(this);if(this.m.za&&!this.m.ta)throw new Lc("Object already scheduled for deletion");Xc(this);var m=this.m;--m.count.value;0===m.count.value&&(m.J?m.T.$(m.J):m.B.o.$(m.v));this.m.ta||(this.m.J=void 0,this.m.v=void 0)},isDeleted:function(){return!this.m.v},deleteLater:function(){this.m.v||pd(this);if(this.m.za&&!this.m.ta)throw new Lc("Object already scheduled for deletion");qd.push(this);this.m.za=!0;return this}});const h=Symbol.dispose;h&&(d[h]=d["delete"])})();
Object.assign(Fd.prototype,{Id(d){this.zc&&(d=this.zc(d));return d},hc(d){this.$?.(d)},S:bd,u:function(d){function h(){return this.Za?Ed(this.o.Y,{B:this.ce,v:m,T:this,J:d}):Ed(this.o.Y,{B:this,v:d})}var m=this.Id(d);if(!m)return this.hc(d),null;var u=Dd(this.o,m);if(void 0!==u){if(0===u.m.count.value)return u.m.v=m,u.m.J=d,u.clone();u=u.clone();this.hc(d);return u}u=this.o.Hd(m);u=sd[u];if(!u)return h.call(this);u=this.Ya?u.ud:u.pointerType;var A=Cd(m,this.o,u.o);return null===A?h.call(this):this.Za?
Ed(u.o.Y,{B:u,v:A,T:this,J:d}):Ed(u.o.Y,{B:u,v:A})}});for(let d=0;32>d;++d)Re.push(Array(d));F.print&&(Mb=F.print);F.printErr&&(Nb=F.printErr);F.wasmBinary&&(Ob=F.wasmBinary);F.thisProgram&&(Bb=F.thisProgram);if(F.preInit)for("function"==typeof F.preInit&&(F.preInit=[F.preInit]);0<F.preInit.length;)F.preInit.shift()();
var df={348219:()=>{F.onAssetChange&&F.onAssetChange()},348277:(d,h,m,u,A)=>{if("undefined"===typeof window||void 0===(window.AudioContext||window.webkitAudioContext))return 0;if("undefined"===typeof window.miniaudio){window.miniaudio={referenceCount:0};window.miniaudio.device_type={};window.miniaudio.device_type.playback=d;window.miniaudio.device_type.capture=h;window.miniaudio.device_type.duplex=m;window.miniaudio.device_state={};window.miniaudio.device_state.stopped=u;window.miniaudio.device_state.started=
A;let D=window.miniaudio;D.devices=[];D.track_device=function(G){for(var E=0;E<D.devices.length;++E)if(null==D.devices[E])return D.devices[E]=G,E;D.devices.push(G);return D.devices.length-1};D.untrack_device_by_index=function(G){for(D.devices[G]=null;0<D.devices.length;)if(null==D.devices[D.devices.length-1])D.devices.pop();else break};D.untrack_device=function(G){for(var E=0;E<D.devices.length;++E)if(D.devices[E]==G)return D.untrack_device_by_index(E)};D.get_device_by_index=function(G){return D.devices[G]};
D.unlock_event_types=["touchend","click"];D.unlock=function(){for(var G=0;G<D.devices.length;++G){var E=D.devices[G];null!=E&&null!=E.U&&E.state===D.device_state.started&&E.U.resume().then(()=>{af(E.vc)},K=>{console.error("Failed to resume audiocontext",K)})}D.unlock_event_types.map(function(K){document.removeEventListener(K,D.unlock,!0)})};D.unlock_event_types.map(function(G){document.addEventListener(G,D.unlock,!0)})}window.miniaudio.referenceCount+=1;return 1},350455:()=>{"undefined"!==typeof window.miniaudio&&
(window.miniaudio.unlock_event_types.map(function(d){document.removeEventListener(d,window.miniaudio.unlock,!0)}),--window.miniaudio.referenceCount,0===window.miniaudio.referenceCount&&delete window.miniaudio)},350759:()=>void 0!==navigator.mediaDevices&&void 0!==navigator.mediaDevices.getUserMedia,350863:()=>{try{var d=new (window.AudioContext||window.webkitAudioContext),h=d.sampleRate;d.close();return h}catch(m){return 0}},351034:(d,h,m,u,A,D)=>{if("undefined"===typeof window.miniaudio)return-1;
var G={},E={};d==window.miniaudio.device_type.playback&&0!=m&&(E.sampleRate=m);G.U=new (window.AudioContext||window.webkitAudioContext)(E);G.U.suspend();G.state=window.miniaudio.device_state.stopped;m=0;d!=window.miniaudio.device_type.playback&&(m=h);G.da=G.U.createScriptProcessor(u,m,h);G.da.onaudioprocess=function(K){if(null==G.Ca||0==G.Ca.length||G.Ca.buffer!==Yb.buffer)G.Ca=new Float32Array(Yb.buffer,Number(A),u*h);if(d==window.miniaudio.device_type.capture||d==window.miniaudio.device_type.duplex){for(var R=
0;R<h;R+=1)for(var X=K.inputBuffer.getChannelData(R),Y=G.Ca,U=0;U<u;U+=1)Y[U*h+R]=X[U];bf(D,u,A)}if(d==window.miniaudio.device_type.playback||d==window.miniaudio.device_type.duplex)for(cf(D,u,A),R=0;R<K.outputBuffer.numberOfChannels;++R)for(X=K.outputBuffer.getChannelData(R),Y=G.Ca,U=0;U<u;U+=1)X[U]=Y[U*h+R];else for(R=0;R<K.outputBuffer.numberOfChannels;++R)K.outputBuffer.getChannelData(R).fill(0)};d!=window.miniaudio.device_type.capture&&d!=window.miniaudio.device_type.duplex||navigator.mediaDevices.getUserMedia({audio:!0,
video:!1}).then(function(K){G.ib=G.U.createMediaStreamSource(K);G.ib.connect(G.da);G.da.connect(G.U.destination)}).catch(function(K){console.log("Failed to get user media: "+K)});d==window.miniaudio.device_type.playback&&G.da.connect(G.U.destination);G.vc=D;return window.miniaudio.track_device(G)},353978:d=>window.miniaudio.get_device_by_index(d).U.sampleRate,354051:d=>{d=window.miniaudio.get_device_by_index(d);void 0!==d.da&&(d.da.onaudioprocess=function(){},d.da.disconnect(),d.da=void 0);void 0!==
d.ib&&(d.ib.disconnect(),d.ib=void 0);d.U.close();d.U=void 0;d.vc=void 0},354451:d=>{window.miniaudio.untrack_device_by_index(d)},354501:d=>{d=window.miniaudio.get_device_by_index(d);d.U.resume();d.state=window.miniaudio.device_state.started},354640:d=>{d=window.miniaudio.get_device_by_index(d);d.U.suspend();d.state=window.miniaudio.device_state.stopped}},Uc,Ue,Tc,ef,ff,gf,hf,jf,kf,lf,mf,nf,of,pf,af,bf,cf,qf,rf,uc,Ze,wc,ic,Id,tf={__syscall_fcntl64:function(){return 0},__syscall_ioctl:function(){return 0},
__syscall_openat:function(){},_abort_js:()=>jc(""),_embind_create_inheriting_constructor:(d,h,m)=>{d=Pc(d);h=Wc(h,"wrapper");m=Mc(m);var u=h.o,A=u.Y,D=u.I.Y,G=u.I.constructor;d=Ic(d,function(...E){for(var K of u.I.xc)if(this[K]===D[K])throw new Oc(`Pure virtual function ${K} must be implemented in JavaScript`);Object.defineProperty(this,"__parent",{value:A});this.__construct(...E)});A.__construct=function(...E){if(this===A)throw new Lc("Pass correct 'this' to __construct");E=G.implement(this,...E);
Xc(E);var K=E.m;E.notifyOnDestruction();K.ta=!0;Object.defineProperties(this,{m:{value:K}});Zc(this);E=K.v;E=Rc(u,E);if(Qc.hasOwnProperty(E))throw new Lc(`Tried to register registered instance: ${E}`);Qc[E]=this};A.__destruct=function(){if(this===A)throw new Lc("Pass correct 'this' to __destruct");Xc(this);var E=this.m.v;E=Rc(u,E);if(Qc.hasOwnProperty(E))delete Qc[E];else throw new Lc(`Tried to unregister unregistered instance: ${E}`);};d.prototype=Object.create(A);Object.assign(d.prototype,m);return Nc(d)},
_embind_finalize_value_object:d=>{var h=$c[d];delete $c[d];var m=h.Kb,u=h.$,A=h.lc,D=A.map(G=>G.Ld).concat(A.map(G=>G.Kl));gd([d],D,G=>{var E={},K,R;for([K,R]of A.entries()){const X=G[K],Y=R.Jd,U=R.Kd,la=G[K+A.length],ca=R.Jl,wa=R.Ll;E[R.Ed]={read:Fa=>X.u(Y(U,Fa)),write:(Fa,Pa)=>{var Aa=[];ca(wa,Fa,la.H(Aa,Pa));ad(Aa)},optional:X.optional}}return[{name:h.name,u:X=>{var Y={},U;for(U in E)Y[U]=E[U].read(X);u(X);return Y},H:(X,Y)=>{for(var U in E)if(!(U in Y||E[U].optional))throw new TypeError(`Missing field: "${U}"`);
var la=m();for(U in E)E[U].write(la,Y[U]);null!==X&&X.push(u,la);return la},S:bd,N:u}]})},_embind_register_bigint:()=>{},_embind_register_bool:(d,h,m,u)=>{h=Pc(h);fd(d,{name:h,u:function(A){return!!A},H:function(A,D){return D?m:u},S:function(A){return this.u(Tb[A])},N:null})},_embind_register_class:(d,h,m,u,A,D,G,E,K,R,X,Y,U)=>{X=Pc(X);D=Ld(A,D);E&&=Ld(G,E);R&&=Ld(K,R);U=Ld(Y,U);var la=vd(X);ud(la,function(){Nd(`Cannot construct ${X} due to unbound types`,[u])});gd([d,h,m],u?[u]:[],ca=>{ca=ca[0];
if(u){var wa=ca.o;var Fa=wa.Y}else Fa=rd.prototype;ca=Ic(X,function(...Wa){if(Object.getPrototypeOf(this)!==Pa)throw new Lc(`Use 'new' to construct ${X}`);if(void 0===Aa.fa)throw new Lc(`${X} has no accessible constructor`);var Ca=Aa.fa[Wa.length];if(void 0===Ca)throw new Lc(`Tried to invoke ctor of ${X} with invalid number of parameters (${Wa.length}) - expected (${Object.keys(Aa.fa).toString()}) parameters instead!`);return Ca.apply(this,Wa)});var Pa=Object.create(Fa,{constructor:{value:ca}});ca.prototype=
Pa;var Aa=new wd(X,ca,Pa,U,wa,D,E,R);if(Aa.I){var Na;(Na=Aa.I).Ma??(Na.Ma=[]);Aa.I.Ma.push(Aa)}wa=new Fd(X,Aa,!0,!1,!1);Na=new Fd(X+"*",Aa,!1,!1,!1);Fa=new Fd(X+" const*",Aa,!1,!0,!1);sd[d]={pointerType:Na,ud:Fa};Gd(la,ca);return[wa,Na,Fa]})},_embind_register_class_class_function:(d,h,m,u,A,D,G)=>{var E=Qd(m,u);h=Pc(h);h=Rd(h);D=Ld(A,D);gd([],[d],K=>{function R(){Nd(`Cannot call ${X} due to unbound types`,E)}K=K[0];var X=`${K.name}.${h}`;h.startsWith("@@")&&(h=Symbol[h.substring(2)]);var Y=K.o.constructor;
void 0===Y[h]?(R.ba=m-1,Y[h]=R):(td(Y,h,X),Y[h].G[m-1]=R);gd([],E,U=>{U=Pd(X,[U[0],null].concat(U.slice(1)),null,D,G);void 0===Y[h].G?(U.ba=m-1,Y[h]=U):Y[h].G[m-1]=U;if(K.o.Ma)for(const la of K.o.Ma)la.constructor.hasOwnProperty(h)||(la.constructor[h]=U);return[]});return[]})},_embind_register_class_class_property:(d,h,m,u,A,D,G,E)=>{h=Pc(h);D=Ld(A,D);gd([],[d],K=>{K=K[0];var R=`${K.name}.${h}`,X={get(){Nd(`Cannot access ${R} due to unbound types`,[m])},enumerable:!0,configurable:!0};X.set=E?()=>
{Nd(`Cannot access ${R} due to unbound types`,[m])}:()=>{throw new Lc(`${R} is a read-only property`);};Object.defineProperty(K.o.constructor,h,X);gd([],[m],Y=>{Y=Y[0];var U={get(){return Y.u(D(u))},enumerable:!0};E&&(E=Ld(G,E),U.set=la=>{var ca=[];E(u,Y.H(ca,la));ad(ca)});Object.defineProperty(K.o.constructor,h,U);return[]});return[]})},_embind_register_class_constructor:(d,h,m,u,A,D)=>{var G=Qd(h,m);A=Ld(u,A);gd([],[d],E=>{E=E[0];var K=`constructor ${E.name}`;void 0===E.o.fa&&(E.o.fa=[]);if(void 0!==
E.o.fa[h-1])throw new Lc(`Cannot register multiple constructors with identical number of parameters (${h-1}) for class '${E.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`);E.o.fa[h-1]=()=>{Nd(`Cannot construct ${E.name} due to unbound types`,G)};gd([],G,R=>{R.splice(1,0,null);E.o.fa[h-1]=Pd(K,R,null,A,D);return[]});return[]})},_embind_register_class_function:(d,h,m,u,A,D,G,E)=>{var K=Qd(m,u);h=Pc(h);h=Rd(h);D=Ld(A,D);gd([],[d],R=>{function X(){Nd(`Cannot call ${Y} due to unbound types`,
K)}R=R[0];var Y=`${R.name}.${h}`;h.startsWith("@@")&&(h=Symbol[h.substring(2)]);E&&R.o.xc.push(h);var U=R.o.Y,la=U[h];void 0===la||void 0===la.G&&la.className!==R.name&&la.ba===m-2?(X.ba=m-2,X.className=R.name,U[h]=X):(td(U,h,Y),U[h].G[m-2]=X);gd([],K,ca=>{ca=Pd(Y,ca,R,D,G);void 0===U[h].G?(ca.ba=m-2,U[h]=ca):U[h].G[m-2]=ca;return[]});return[]})},_embind_register_class_property:(d,h,m,u,A,D,G,E,K,R)=>{h=Pc(h);A=Ld(u,A);gd([],[d],X=>{X=X[0];var Y=`${X.name}.${h}`,U={get(){Nd(`Cannot access ${Y} due to unbound types`,
[m,G])},enumerable:!0,configurable:!0};U.set=K?()=>Nd(`Cannot access ${Y} due to unbound types`,[m,G]):()=>{throw new Lc(Y+" is a read-only property");};Object.defineProperty(X.o.Y,h,U);gd([],K?[m,G]:[m],la=>{var ca=la[0],wa={get(){var Pa=Sd(this,X,Y+" getter");return ca.u(A(D,Pa))},enumerable:!0};if(K){K=Ld(E,K);var Fa=la[1];wa.set=function(Pa){var Aa=Sd(this,X,Y+" setter"),Na=[];K(R,Aa,Fa.H(Na,Pa));ad(Na)}}Object.defineProperty(X.o.Y,h,wa);return[]});return[]})},_embind_register_emval:d=>fd(d,Ud),
_embind_register_enum:(d,h,m,u,A)=>{h=Pc(h);A=0===A?"object":1===A?"number":"string";switch(A){case "object":function G(){}G.values={};fd(d,{name:h,constructor:G,valueType:A,u:function(E){return this.constructor.values[E]},H:(E,K)=>K.value,S:Vd(h,m,u),N:null});ud(h,G);break;case "number":var D={};fd(d,{name:h,Db:D,valueType:A,u:E=>E,H:(E,K)=>K,S:Vd(h,m,u),N:null});ud(h,D);delete F[h].ba;break;case "string":D={},fd(d,{name:h,Mc:{},Cc:{},Db:D,valueType:A,u:function(E){return this.Cc[E]},H:function(E,
K){return this.Mc[K]},S:Vd(h,m,u),N:null}),ud(h,D),delete F[h].ba}},_embind_register_enum_value:(d,h,m)=>{var u=Wc(d,"enum");h=Pc(h);switch(u.valueType){case "object":d=u.constructor;u=Object.create(u.constructor.prototype,{value:{value:m},constructor:{value:Ic(`${u.name}_${h}`,function(){})}});d.values[m]=u;d[h]=u;break;case "number":u.Db[h]=m;break;case "string":u.Mc[h]=m,u.Cc[m]=h,u.Db[h]=h}},_embind_register_float:(d,h,m)=>{h=Pc(h);fd(d,{name:h,u:u=>u,H:(u,A)=>A,S:Wd(h,m),N:null})},_embind_register_function:(d,
h,m,u,A,D)=>{var G=Qd(h,m);d=Pc(d);d=Rd(d);A=Ld(u,A);ud(d,function(){Nd(`Cannot call ${d} due to unbound types`,G)},h-1);gd([],G,E=>{Gd(d,Pd(d,[E[0],null].concat(E.slice(1)),null,A,D),h-1);return[]})},_embind_register_integer:(d,h,m,u,A)=>{h=Pc(h);let D=E=>E;if(0===u){var G=32-8*m;D=E=>E<<G>>>G;A=D(A)}fd(d,{name:h,u:D,H:(E,K)=>K,S:Xd(h,m,0!==u),N:null})},_embind_register_memory_view:(d,h,m)=>{function u(D){return new A(Sb.buffer,Xb[D+4>>2],Xb[D>>2])}var A=[Int8Array,Uint8Array,Int16Array,Uint16Array,
Int32Array,Uint32Array,Float32Array,Float64Array][h];m=Pc(m);fd(d,{name:m,u,S:u},{Qd:!0})},_embind_register_std_string:(d,h)=>{h=Pc(h);fd(d,{name:h,u(m){var u=(u=m+4)?Hc(Tb,u,Xb[m>>2],!0):"";Uc(m);return u},H(m,u){u instanceof ArrayBuffer&&(u=new Uint8Array(u));var A="string"==typeof u;if(!(A||ArrayBuffer.isView(u)&&1==u.BYTES_PER_ELEMENT))throw new Lc("Cannot pass non-string to std::string");var D=A?Zd(u):u.length;var G=Ue(4+D+1),E=G+4;Xb[G>>2]=D;A?Yd(u,E,D+1):Tb.set(u,E);null!==m&&m.push(Uc,G);
return G},S:bd,N(m){Uc(m)}})},_embind_register_std_wstring:(d,h,m)=>{m=Pc(m);if(2===h){var u=ae;var A=be;var D=ce}else u=de,A=ee,D=fe;fd(d,{name:m,u:G=>{var E=u(G+4,Xb[G>>2]*h,!0);Uc(G);return E},H:(G,E)=>{if("string"!=typeof E)throw new Lc(`Cannot pass non-string to C++ string type ${m}`);var K=D(E),R=Ue(4+K+h);Xb[R>>2]=K/h;A(E,R+4,K+h);null!==G&&G.push(Uc,R);return R},S:bd,N(G){Uc(G)}})},_embind_register_value_object:(d,h,m,u,A,D)=>{$c[d]={name:Pc(h),Kb:Ld(m,u),$:Ld(A,D),lc:[]}},_embind_register_value_object_field:(d,
h,m,u,A,D,G,E,K,R)=>{$c[d].lc.push({Ed:Pc(h),Ld:m,Jd:Ld(u,A),Kd:D,Kl:G,Jl:Ld(E,K),Ll:R})},_embind_register_void:(d,h)=>{h=Pc(h);fd(d,{Sd:!0,name:h,u:()=>{},H:()=>{}})},_emscripten_throw_longjmp:()=>{throw Infinity;},_emval_create_invoker:(d,h,m)=>{var [u,...A]=ie(d,h),D=u.H.bind(u),G=A.map(K=>K.S.bind(K));d--;var E=Array(d);h=`methodCaller<(${A.map(K=>K.name)}) => ${u.name}>`;return he(Ic(h,(K,R,X,Y)=>{for(var U=0,la=0;la<d;++la)E[la]=G[la](Y+U),U+=8;switch(m){case 0:var ca=Mc(K).apply(null,E);break;
case 2:ca=Reflect.construct(Mc(K),E);break;case 3:ca=E[0];break;case 1:ca=Mc(K)[ke(R)](...E)}K=[];ca=D(K,ca);K.length&&(Xb[X>>2]=Nc(K));return ca}))},_emval_decref:Td,_emval_get_module_property:d=>{d=ke(d);return Nc(F[d])},_emval_get_property:(d,h)=>{d=Mc(d);h=Mc(h);return Nc(d[h])},_emval_incref:d=>{9<d&&(Kc[d+1]+=1)},_emval_invoke:(d,h,m,u,A)=>ge[d](h,m,u,A),_emval_new_array:()=>Nc([]),_emval_new_cstring:d=>Nc(ke(d)),_emval_new_object:()=>Nc({}),_emval_run_destructors:d=>{var h=Mc(d);ad(h);Td(d)},
_emval_set_property:(d,h,m)=>{d=Mc(d);h=Mc(h);m=Mc(m);d[h]=m},_gmtime_js:function(d,h,m){d=new Date(1E3*(h+2097152>>>0<4194305-!!d?(d>>>0)+4294967296*h:NaN));Wb[m>>2]=d.getUTCSeconds();Wb[m+4>>2]=d.getUTCMinutes();Wb[m+8>>2]=d.getUTCHours();Wb[m+12>>2]=d.getUTCDate();Wb[m+16>>2]=d.getUTCMonth();Wb[m+20>>2]=d.getUTCFullYear()-1900;Wb[m+24>>2]=d.getUTCDay();Wb[m+28>>2]=(d.getTime()-Date.UTC(d.getUTCFullYear(),0,1,0,0,0,0))/864E5|0},_localtime_js:function(d,h,m){d=new Date(1E3*(h+2097152>>>0<4194305-
!!d?(d>>>0)+4294967296*h:NaN));Wb[m>>2]=d.getSeconds();Wb[m+4>>2]=d.getMinutes();Wb[m+8>>2]=d.getHours();Wb[m+12>>2]=d.getDate();Wb[m+16>>2]=d.getMonth();Wb[m+20>>2]=d.getFullYear()-1900;Wb[m+24>>2]=d.getDay();h=d.getFullYear();Wb[m+28>>2]=(0!==h%4||0===h%100&&0!==h%400?me:le)[d.getMonth()]+d.getDate()-1|0;Wb[m+36>>2]=-(60*d.getTimezoneOffset());h=(new Date(d.getFullYear(),6,1)).getTimezoneOffset();var u=(new Date(d.getFullYear(),0,1)).getTimezoneOffset();Wb[m+32>>2]=(h!=u&&d.getTimezoneOffset()==
Math.min(u,h))|0},_timegm_js:function(d){var h=new Date(Date.UTC(Wb[d+20>>2]+1900,Wb[d+16>>2],Wb[d+12>>2],Wb[d+8>>2],Wb[d+4>>2],Wb[d>>2],0));Wb[d+24>>2]=h.getUTCDay();Wb[d+28>>2]=(h.getTime()-Date.UTC(h.getUTCFullYear(),0,1,0,0,0,0))/864E5|0;d=h.getTime()/1E3;rf((oc=d,1<=+Math.abs(oc)?0<oc?+Math.floor(oc/4294967296)>>>0:~~+Math.ceil((oc-+(~~oc>>>0))/4294967296)>>>0:0));return d>>>0},_tzset_js:(d,h,m,u)=>{var A=(new Date).getFullYear(),D=(new Date(A,0,1)).getTimezoneOffset();A=(new Date(A,6,1)).getTimezoneOffset();
Xb[d>>2]=60*Math.max(D,A);Wb[h>>2]=Number(D!=A);h=G=>{var E=Math.abs(G);return`UTC${0<=G?"-":"+"}${String(Math.floor(E/60)).padStart(2,"0")}${String(E%60).padStart(2,"0")}`};d=h(D);h=h(A);A<D?(Yd(d,m,17),Yd(h,u,17)):(Yd(d,u,17),Yd(h,m,17))},beginPixelLocalStorageWEBGL:function(d,h,m){(d=De[d].K.gb)&&d.beginPixelLocalStorageWEBGL(new Uint32Array(ic.buffer,4*m,h))},clock_time_get:function(d,h,m,u){if(!(0<=d&&3>=d))return 28;d=0===d?Date.now():performance.now();d=Math.round(1E6*d);pc=[d>>>0,(oc=d,1<=
+Math.abs(oc)?0<oc?+Math.floor(oc/4294967296)>>>0:~~+Math.ceil((oc-+(~~oc>>>0))/4294967296)>>>0:0)];Wb[u>>2]=pc[0];Wb[u+4>>2]=pc[1];return 0},decode_image:function(d,h,m,u,A){var D=F.images;D||(D=new Map,F.images=D);m=new Uint8Array(ic.buffer,m,u);u=new Uint8Array(u);u.set(m);u=new Blob([u],{type:"image/png"});if(A)A=F.imageBlobs,A||(A=new Map,F.imageBlobs=A),A.set(h,u),F.riveReplayWorkerDecodeImage(d,h,u);else{var G=new Image;D.set(h,G);G.src=URL.createObjectURL(u);G.onload=function(){F._setWebImage(d,
G.width,G.height)}}},delete_image:function(d){var h=F.images,m=h&&h.get(d);m&&(m.close&&m.close(),h.delete(d));(h=F.imageBlobs)&&h.delete(d)},emscripten_asm_const_int:(d,h,m)=>{ne.length=0;for(var u;u=Tb[h++];){var A=105!=u;A&=112!=u;m+=A&&m%8?4:0;ne.push(112==u?Xb[m>>2]:105==u?Wb[m>>2]:Zb[m>>3]);m+=A?8:4}return df[d](...ne)},emscripten_date_now:()=>Date.now(),emscripten_get_now:()=>performance.now(),emscripten_is_main_browser_thread:()=>!ta,emscripten_resize_heap:d=>{var h=Tb.length;d>>>=0;if(2147483648<
d)return!1;for(var m=1;4>=m;m*=2){var u=h*(1+.2/m);u=Math.min(u,d+100663296);a:{u=(Math.min(2147483648,65536*Math.ceil(Math.max(d,u)/65536))-ic.buffer.byteLength+65535)/65536|0;try{ic.grow(u);hc();var A=1;break a}catch(D){}A=void 0}if(A)return!0}return!1},emscripten_webgl_enable_extension:(d,h)=>{d=De[d];h=h?Hc(Tb,h):"";h.startsWith("GL_")&&(h=h.slice(3));"WEBGL_draw_instanced_base_vertex_base_instance"==h&&oe(P);"WEBGL_multi_draw_instanced_base_vertex_base_instance"==h&&pe(P);"WEBGL_multi_draw"==
h&&(P.Xd=P.getExtension("WEBGL_multi_draw"));"EXT_polygon_offset_clamp"==h&&(P.Dd=P.getExtension("EXT_polygon_offset_clamp"));"EXT_clip_control"==h&&(P.Cd=P.getExtension("EXT_clip_control"));"WEBGL_polygon_mode"==h&&(P.Ql=P.getExtension("WEBGL_polygon_mode"));return!!d.K.getExtension(h)},emscripten_webgl_get_current_context:()=>Me?Me.handle:0,emscripten_webgl_make_context_current:d=>jb(d)?0:-5,enable_WEBGL_provoking_vertex:function(d){d=De[d].K;d.yc=d.getExtension("WEBGL_provoking_vertex");return!!d.yc},
enable_WEBGL_shader_pixel_local_storage_coherent:function(d){d=De[d].K;const h=d.getExtension("WEBGL_shader_pixel_local_storage");if(h&&h.isCoherent()){if(5==h.framebufferTexturePixelLocalStorageWEBGL.length)return d.gb=h,!0;console.warn("WEBGL_shader_pixel_local_storage is advertised, but a deprecated version has been detected. Disabling.")}return!1},endPixelLocalStorageWEBGL:function(d,h,m){(d=De[d].K.gb)&&d.endPixelLocalStorageWEBGL(new Uint32Array(ic.buffer,4*m,h))},ensure_images_map:function(){F.images||
(F.images=new Map)},environ_get:(d,h)=>{var m=0,u=0,A;for(A of Pe()){var D=h+m;Xb[d+u>>2]=D;m+=Yd(A,D,Infinity)+1;u+=4}return 0},environ_sizes_get:(d,h)=>{var m=Pe();Xb[d>>2]=m.length;d=0;for(var u of m)d+=Zd(u)+1;Xb[h>>2]=d;return 0},fd_close:()=>52,fd_read:()=>52,fd_seek:function(){return 70},fd_write:(d,h,m,u)=>{for(var A=0,D=0;D<m;D++){var G=Xb[h>>2],E=Xb[h+4>>2];h+=8;for(var K=0;K<E;K++){var R=d,X=Tb[G+K],Y=Qe[R];0===X||10===X?((1===R?Mb:Nb)(Hc(Y)),Y.length=0):Y.push(X)}A+=E}Xb[u>>2]=A;return 0},
framebufferPixelLocalClearValuefvWEBGL:function(d,h,m,u,A,D){(d=De[d].K.gb)&&d.framebufferPixelLocalClearValuefvWEBGL(h,[m,u,A,D])},framebufferTexturePixelLocalStorageWEBGL:function(d,h,m,u,A,D){(d=De[d].K.gb)&&d.framebufferTexturePixelLocalStorageWEBGL(h,we[m],u,A,D)},glActiveTexture:d=>P.activeTexture(d),glAttachShader:(d,h)=>{P.attachShader(te[d],xe[h])},glBindBuffer:(d,h)=>{35051==d?P.xb=h:35052==d&&(P.ya=h);P.bindBuffer(d,se[h])},glBindBufferRange:(d,h,m,u,A)=>{P.bindBufferRange(d,h,se[m],u,
A)},glBindFramebuffer:(d,h)=>{P.bindFramebuffer(d,ue[h])},glBindRenderbuffer:(d,h)=>{P.bindRenderbuffer(d,ve[h])},glBindSampler:(d,h)=>{P.bindSampler(d,Ee[h])},glBindTexture:(d,h)=>{P.bindTexture(d,we[h])},glBindVertexArray:d=>{P.bindVertexArray(ye[d])},glBlendEquation:d=>P.blendEquation(d),glBlendFunc:(d,h)=>P.blendFunc(d,h),glBlitFramebuffer:(d,h,m,u,A,D,G,E,K,R)=>P.blitFramebuffer(d,h,m,u,A,D,G,E,K,R),glBufferData:(d,h,m,u)=>{m&&h?P.bufferData(d,Tb,u,m,h):P.bufferData(d,h,u)},glBufferSubData:(d,
h,m,u)=>{m&&P.bufferSubData(d,h,Tb,u,m)},glClear:d=>P.clear(d),glClearBufferfv:(d,h,m)=>{P.clearBufferfv(d,h,Yb,m>>2)},glClearBufferuiv:(d,h,m)=>{P.clearBufferuiv(d,h,Xb,m>>2)},glClearColor:(d,h,m,u)=>P.clearColor(d,h,m,u),glClearDepthf:d=>P.clearDepth(d),glClearStencil:d=>P.clearStencil(d),glClientWaitSync:(d,h,m,u)=>P.clientWaitSync(Fe[d],h,(m>>>0)+4294967296*u),glColorMask:(d,h,m,u)=>{P.colorMask(!!d,!!h,!!m,!!u)},glCompileShader:d=>{P.compileShader(xe[d])},glCompressedTexSubImage2D:(d,h,m,u,A,
D,G,E,K)=>{P.ya||!E?P.compressedTexSubImage2D(d,h,m,u,A,D,G,E,K):P.compressedTexSubImage2D(d,h,m,u,A,D,G,Tb,K,E)},glCreateProgram:()=>{var d=Je(te),h=P.createProgram();h.name=d;h.cb=h.ab=h.bb=0;h.Tb=1;te[d]=h;return d},glCreateShader:d=>{var h=Je(xe);xe[h]=P.createShader(d);return h},glCullFace:d=>P.cullFace(d),glDeleteBuffers:(d,h)=>{for(var m=0;m<d;m++){var u=Wb[h+4*m>>2],A=se[u];A&&(P.deleteBuffer(A),A.name=0,se[u]=null,u==P.xb&&(P.xb=0),u==P.ya&&(P.ya=0))}},glDeleteFramebuffers:(d,h)=>{for(var m=
0;m<d;++m){var u=Wb[h+4*m>>2],A=ue[u];A&&(P.deleteFramebuffer(A),A.name=0,ue[u]=null)}},glDeleteProgram:d=>{if(d){var h=te[d];h?(P.deleteProgram(h),h.name=0,te[d]=null):Ke||=1281}},glDeleteRenderbuffers:(d,h)=>{for(var m=0;m<d;m++){var u=Wb[h+4*m>>2],A=ve[u];A&&(P.deleteRenderbuffer(A),A.name=0,ve[u]=null)}},glDeleteShader:d=>{if(d){var h=xe[d];h?(P.deleteShader(h),xe[d]=null):Ke||=1281}},glDeleteSync:d=>{if(d){var h=Fe[d];h?(P.deleteSync(h),h.name=0,Fe[d]=null):Ke||=1281}},glDeleteTextures:(d,h)=>
{for(var m=0;m<d;m++){var u=Wb[h+4*m>>2],A=we[u];A&&(P.deleteTexture(A),A.name=0,we[u]=null)}},glDeleteVertexArrays:(d,h)=>{for(var m=0;m<d;m++){var u=Wb[h+4*m>>2];P.deleteVertexArray(ye[u]);ye[u]=null}},glDepthFunc:d=>P.depthFunc(d),glDepthMask:d=>{P.depthMask(!!d)},glDepthRangef:(d,h)=>P.depthRange(d,h),glDisable:d=>P.disable(d),glDrawArrays:(d,h,m)=>{P.drawArrays(d,h,m)},glDrawArraysInstanced:(d,h,m,u)=>{P.drawArraysInstanced(d,h,m,u)},glDrawBuffers:(d,h)=>{for(var m=Re[d],u=0;u<d;u++)m[u]=Wb[h+
4*u>>2];P.drawBuffers(m)},glDrawElements:(d,h,m,u)=>{P.drawElements(d,h,m,u)},glDrawElementsInstanced:(d,h,m,u,A)=>{P.drawElementsInstanced(d,h,m,u,A)},glEnable:d=>P.enable(d),glEnableVertexAttribArray:d=>{P.enableVertexAttribArray(d)},glFenceSync:(d,h)=>(d=P.fenceSync(d,h))?(h=Je(Fe),d.name=h,Fe[h]=d,h):0,glFlush:()=>P.flush(),glFramebufferRenderbuffer:(d,h,m,u)=>{P.framebufferRenderbuffer(d,h,m,ve[u])},glFramebufferTexture2D:(d,h,m,u,A)=>{P.framebufferTexture2D(d,h,m,we[u],A)},glFrontFace:d=>P.frontFace(d),
glGenBuffers:(d,h)=>{Le(d,h,"createBuffer",se)},glGenFramebuffers:(d,h)=>{Le(d,h,"createFramebuffer",ue)},glGenRenderbuffers:(d,h)=>{Le(d,h,"createRenderbuffer",ve)},glGenTextures:(d,h)=>{Le(d,h,"createTexture",we)},glGenVertexArrays:(d,h)=>{Le(d,h,"createVertexArray",ye)},glGenerateMipmap:d=>P.generateMipmap(d),glGetFramebufferAttachmentParameteriv:(d,h,m,u)=>{d=P.getFramebufferAttachmentParameter(d,h,m);if(d instanceof WebGLRenderbuffer||d instanceof WebGLTexture)d=d.name|0;Wb[u>>2]=d},glGetIntegerv:(d,
h)=>Te(d,h),glGetProgramiv:(d,h,m)=>{if(m)if(d>=re)Ke||=1281;else if(d=te[d],35716==h)d=P.getProgramInfoLog(d),null===d&&(d="(unknown error)"),Wb[m>>2]=d.length+1;else if(35719==h){if(!d.cb){var u=P.getProgramParameter(d,35718);for(h=0;h<u;++h)d.cb=Math.max(d.cb,P.getActiveUniform(d,h).name.length+1)}Wb[m>>2]=d.cb}else if(35722==h){if(!d.ab)for(u=P.getProgramParameter(d,35721),h=0;h<u;++h)d.ab=Math.max(d.ab,P.getActiveAttrib(d,h).name.length+1);Wb[m>>2]=d.ab}else if(35381==h){if(!d.bb)for(u=P.getProgramParameter(d,
35382),h=0;h<u;++h)d.bb=Math.max(d.bb,P.getActiveUniformBlockName(d,h).length+1);Wb[m>>2]=d.bb}else Wb[m>>2]=P.getProgramParameter(d,h);else Ke||=1281},glGetString:d=>{var h=Ge[d];if(!h){switch(d){case 7939:h=Ve(Se().join(" "));break;case 7936:case 7937:case 37445:case 37446:(h=P.getParameter(d))||(Ke||=1280);h=h?Ve(h):0;break;case 7938:h=Ve(`OpenGL ES 3.0 (${P.getParameter(7938)})`);break;case 35724:h=P.getParameter(35724);var m=h.match(/^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/);null!==m&&(3==
m[1].length&&(m[1]+="0"),h=`OpenGL ES GLSL ES ${m[1]} (${h})`);h=Ve(h);break;default:Ke||=1280}Ge[d]=h}return h},glGetUniformBlockIndex:(d,h)=>P.getUniformBlockIndex(te[d],h?Hc(Tb,h):""),glGetUniformLocation:(d,h)=>{h=h?Hc(Tb,h):"";if(d=te[d]){var m=d,u=m.Ja,A=m.Lc,D;if(!u){m.Ja=u={};m.Kc={};var G=P.getProgramParameter(m,35718);for(D=0;D<G;++D){var E=P.getActiveUniform(m,D);var K=E.name;E=E.size;var R=We(K);R=0<R?K.slice(0,R):K;var X=m.Tb;m.Tb+=E;A[R]=[E,X];for(K=0;K<E;++K)u[X]=K,m.Kc[X++]=R}}m=d.Ja;
u=0;A=h;D=We(h);0<D&&(u=parseInt(h.slice(D+1))>>>0,A=h.slice(0,D));if((A=d.Lc[A])&&u<A[0]&&(u+=A[1],m[u]=m[u]||P.getUniformLocation(d,h)))return u}else Ke||=1281;return-1},glInvalidateFramebuffer:(d,h,m)=>{for(var u=Re[h],A=0;A<h;A++)u[A]=Wb[m+4*A>>2];P.invalidateFramebuffer(d,u)},glLinkProgram:d=>{d=te[d];P.linkProgram(d);d.Ja=0;d.Lc={}},glPixelStorei:(d,h)=>{3317==d?He=h:3314==d&&(Ie=h);P.pixelStorei(d,h)},glReadPixels:(d,h,m,u,A,D,G)=>{if(P.xb)P.readPixels(d,h,m,u,A,D,G);else{var E=Xe(D);G>>>=
31-Math.clz32(E.BYTES_PER_ELEMENT);P.readPixels(d,h,m,u,A,D,E,G)}},glRenderbufferStorage:(d,h,m,u)=>P.renderbufferStorage(d,h,m,u),glRenderbufferStorageMultisample:(d,h,m,u,A)=>P.renderbufferStorageMultisample(d,h,m,u,A),glScissor:(d,h,m,u)=>P.scissor(d,h,m,u),glShaderSource:(d,h,m,u)=>{for(var A="",D=0;D<h;++D){var G=(G=Xb[m+4*D>>2])?Hc(Tb,G,u?Xb[u+4*D>>2]:void 0):"";A+=G}P.shaderSource(xe[d],A)},glStencilFunc:(d,h,m)=>P.stencilFunc(d,h,m),glStencilFuncSeparate:(d,h,m,u)=>P.stencilFuncSeparate(d,
h,m,u),glStencilMask:d=>P.stencilMask(d),glStencilOp:(d,h,m)=>P.stencilOp(d,h,m),glStencilOpSeparate:(d,h,m,u)=>P.stencilOpSeparate(d,h,m,u),glTexImage2D:(d,h,m,u,A,D,G,E,K)=>{if(P.ya)P.texImage2D(d,h,m,u,A,D,G,E,K);else if(K){var R=Xe(E);K>>>=31-Math.clz32(R.BYTES_PER_ELEMENT);P.texImage2D(d,h,m,u,A,D,G,E,R,K)}else R=K?Ye(E,G,u,A,K):null,P.texImage2D(d,h,m,u,A,D,G,E,R)},glTexParameteri:(d,h,m)=>P.texParameteri(d,h,m),glTexStorage2D:(d,h,m,u,A)=>P.texStorage2D(d,h,m,u,A),glTexStorage3D:(d,h,m,u,A,
D)=>P.texStorage3D(d,h,m,u,A,D),glTexSubImage2D:(d,h,m,u,A,D,G,E,K)=>{if(P.ya)P.texSubImage2D(d,h,m,u,A,D,G,E,K);else if(K){var R=Xe(E);P.texSubImage2D(d,h,m,u,A,D,G,E,R,K>>>31-Math.clz32(R.BYTES_PER_ELEMENT))}else K=K?Ye(E,G,A,D,K):null,P.texSubImage2D(d,h,m,u,A,D,G,E,K)},glUniform1i:(d,h)=>{var m=P,u=m.uniform1i;var A=P.xd;if(A){var D=A.Ja[d];"number"==typeof D&&(A.Ja[d]=D=P.getUniformLocation(A,A.Kc[d]+(0<D?`[${D}]`:"")));d=D}else Ke||=1282,d=void 0;u.call(m,d,h)},glUniformBlockBinding:(d,h,m)=>
{d=te[d];P.uniformBlockBinding(d,h,m)},glUseProgram:d=>{d=te[d];P.useProgram(d);P.xd=d},glVertexAttribDivisor:(d,h)=>{P.vertexAttribDivisor(d,h)},glVertexAttribIPointer:(d,h,m,u,A)=>{P.vertexAttribIPointer(d,h,m,u,A)},glVertexAttribPointer:(d,h,m,u,A,D)=>{P.vertexAttribPointer(d,h,m,!!u,A,D)},glViewport:(d,h,m,u)=>P.viewport(d,h,m,u),invoke_vii:sf,isWindowsBrowser:function(){return-1<navigator.platform.indexOf("Win")},provokingVertexWEBGL:function(d,h){(d=De[d].K.yc)&&d.provokingVertexWEBGL(h)},riveWebAttachRunner:function(d){const h=
F.riveScripting;if(!h)return 0;const m=(u,A)=>{u=Ve(u);A(u);Uc(u)};h.jd({exports:F,Od:u=>{u=Xb[(mf()>>2)+u];return 0===u?void 0:Id.get(u)},ga:()=>Tb,oc:()=>Zb,Ia:xc,hb:$e,Ha:vc,Gb:Ue,ra:Uc,La:u=>u?Hc(Tb,u):"",Sc:(u,A,D)=>Yd(u,A,D),memory:()=>ic,ee:(u,A,D)=>m(D,G=>F._rive_web_processor_event(u,A,G)),Eb:(u,A)=>m(A,D=>kf(u,D)),Td:(u,A)=>m(A,D=>jf(u,D)),Ud:u=>{u=lf(u);return 0===u?null:u?Hc(Tb,u):""},$d:d});return 1},riveWebAudioRefusal:function(){const d=F.riveScripting.audioRefusal();return null===
d?0:Ve(d)},riveWebCall:function(d,h,m,u,A,D,G){return F.riveScripting.call(d,h,m,u,A,D,G)},riveWebHasExport:function(d,h){return F.riveScripting.Md(d,h)},riveWebJobRun:function(d,h,m,u,A,D,G,E,K,R){d=F.riveScripting.runJob(d,h,()=>Tb.slice(m,m+u),A,Tb.slice(D,D+G),()=>Atomics.load(Wb,E>>2),K);if(!d.ok)return Ve(d.error);R=hf(R,d.output.length);Tb.set(d.output,R);return 0},riveWebMemoryPages:function(d){return F.riveScripting.ae(d)},riveWebPreparing:function(d){return F.riveScripting.ia(d)},riveWebRaise:function(d,
h){F.riveScripting.ge(d,h)},riveWebReadMemory:function(d,h,m,u){return F.riveScripting.read(d,h>>>0,m,u>>>0)},riveWebRegister:function(d,h,m){F.riveScripting.register(d,Tb.subarray(h,h+m))},riveWebRelease:function(d){F.riveScripting?.release(d)},riveWebStart:function(d){d=F.riveScripting.start(d);return null===d?0:Ve(d)},riveWebStringLength:function(d,h){return F.riveScripting.Ol(d,h>>>0)},riveWebTimeOrigin:function(){return performance.timeOrigin},riveWebWorkerCollect:function(d){d=F.riveScripting.workerCollect(d);
return null===d?0:Ve(d)},riveWebWorkerEnd:function(d){F.riveScripting.workerEnd(d)},riveWebWorkerStart:function(d,h,m,u,A,D,G,E,K,R){let X=!1;h=F.riveScripting.workerStart(h,m,()=>Tb.slice(u,u+A),D,Tb.slice(G,G+E),{wait:(Y,U,la)=>nf(d,Y,U,la),finished:(Y,U)=>{if(!X){X=!0;if(Y){const la=hf(K,U.length);Tb.set(U,la)}of(d,Y)}},Nl:()=>pf(d)});if(!h.ok)return Ve(h.error);Xb[R>>2]=h.id;return 0},riveWebWorkerWake:function(d,h,m){d=F.riveScripting.workerWake(d,h,m);return null===d?0:Ve(d)},riveWebWriteMemory:function(d,
h,m,u){return F.riveScripting.write(d,h>>>0,m,u>>>0)},upload_image:function(d,h){var m=F.images;m&&(h=m.get(h))&&(d=De[d].K,d.pixelStorei(d.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),d.texImage2D(d.TEXTURE_2D,0,d.RGBA,d.RGBA,d.UNSIGNED_BYTE,h),d.pixelStorei(d.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1))},wasm_start_image_decode:function(d,h,m){h=new Uint8Array(ic.buffer,h,m);var u=new Uint8Array(m);u.set(h);Promise.resolve().then(function(){return createImageBitmap(new Blob([u]))}).then(function(A){var D=(new OffscreenCanvas(A.width,
A.height)).getContext("2d");D.drawImage(A,0,0);D=D.getImageData(0,0,A.width,A.height);var G=D.data.length,E=ef(G);E?((new Uint8Array(ic.buffer,E,G)).set(D.data),ff(d,A.width,A.height,E,G)):gf(d)}).catch(function(){gf(d)})}};function sf(d,h,m){var u=wc();try{Id.get(d)(h,m)}catch(A){uc(u);if(A!==A+0)throw A;qf(1,0)}}var uf;
uf=await (async function(){function d(m){m=uf=m.exports;Uc=m.free;Ue=m.malloc;F._setWebImage=m.setWebImage;Tc=m.__getTypeName;ef=F._wasm_image_decode_alloc=m.wasm_image_decode_alloc;ff=F._wasm_image_decode_complete=m.wasm_image_decode_complete;gf=F._wasm_image_decode_error=m.wasm_image_decode_error;F._rive_web_vm_module_export=m.rive_web_vm_module_export;F._rive_web_vm_frame_boundary=m.rive_web_vm_frame_boundary;hf=F._rive_web_job_output=m.rive_web_job_output;jf=F._rive_web_lane_fail=m.rive_web_lane_fail;
kf=F._rive_web_lane_log=m.rive_web_lane_log;lf=F._rive_web_lane_fuel=m.rive_web_lane_fuel;F._rive_web_vm_booting=m.rive_web_vm_booting;F._rive_web_vm_start_fuel=m.rive_web_vm_start_fuel;F._rive_web_vm_start_refusal=m.rive_web_vm_start_refusal;mf=F._rive_web_calls=m.rive_web_calls;nf=F._rive_web_worker_wait=m.rive_web_worker_wait;of=F._rive_web_worker_finished=m.rive_web_worker_finished;pf=F._rive_web_worker_stopping=m.rive_web_worker_stopping;af=F._ma_device__on_notification_unlocked=m.ma_device__on_notification_unlocked;
F._ma_malloc_emscripten=m.ma_malloc_emscripten;F._ma_free_emscripten=m.ma_free_emscripten;bf=F._ma_device_process_pcm_frames_capture__webaudio=m.ma_device_process_pcm_frames_capture__webaudio;cf=F._ma_device_process_pcm_frames_playback__webaudio=m.ma_device_process_pcm_frames_playback__webaudio;qf=m.setThrew;rf=m._emscripten_tempret_set;uc=m._emscripten_stack_restore;Ze=m._emscripten_stack_alloc;wc=m.emscripten_stack_get_current;Hd.vij=m.dynCall_vij;Hd.iij=m.dynCall_iij;Hd.ji=m.dynCall_ji;Hd.iiiji=
m.dynCall_iiiji;Hd.iiji=m.dynCall_iiji;Hd.jii=m.dynCall_jii;Hd.vijj=m.dynCall_vijj;Hd.jiji=m.dynCall_jiji;ic=m.memory;Id=m.__indirect_function_table;hc();return uf}var h={env:tf,wasi_snapshot_preview1:tf};if(F.instantiateWasm)return new Promise(m=>{F.instantiateWasm(h,(u,A)=>{m(d(u,A))})});kc??=F.locateFile?F.locateFile("canvas_advanced.wasm",Cb):Cb+"canvas_advanced.wasm";return d((await nc(h)).instance)}());
(function(){function d(){F.calledRun=!0;if(!Pb){$b=!0;uf.__wasm_call_ctors();Qb?.(F);F.onRuntimeInitialized?.();if(F.postRun)for("function"==typeof F.postRun&&(F.postRun=[F.postRun]);F.postRun.length;){var h=F.postRun.shift();rc.push(h)}qc(rc)}}if(F.preRun)for("function"==typeof F.preRun&&(F.preRun=[F.preRun]);F.preRun.length;)tc();qc(sc);F.setStatus?(F.setStatus("Running..."),setTimeout(()=>{setTimeout(()=>F.setStatus(""),1);d()},1)):d()})();$b?moduleRtn=F:moduleRtn=new Promise((d,h)=>{Qb=d;Rb=h});
;return moduleRtn}})();
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Rive);


/***/ }),
/* 5 */
/***/ (() => {

/* (ignored) */

/***/ }),
/* 6 */
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"name":"@rive-app/canvas","version":"2.55.0","description":"Rive web runtime with the canvas renderer. Rive is an agent-native 2D and 3D engine for games, apps, and interactive UI.","main":"rive.js","homepage":"https://rive.app","repository":{"type":"git","url":"https://github.com/rive-app/rive-wasm/tree/master/js"},"keywords":["rive","animation","interactive","ui","game-engine","graphics"],"author":"Rive","contributors":["Luigi Rosso <luigi@rive.app> (https://rive.app)","Maxwell Talbot <max@rive.app> (https://rive.app)","Arthur Vivian <arthur@rive.app> (https://rive.app)","Umberto Sonnino <umberto@rive.app> (https://rive.app)","Matthew Sullivan <matt.j.sullivan@gmail.com> (mailto:matt.j.sullivan@gmail.com)"],"license":"MIT","files":["rive.js","rive.js.map","rive.wasm","rive_fallback.wasm","rive.d.ts","rive_advanced.mjs.d.ts","runtimeLoader.d.ts","utils","semantics"],"typings":"rive.d.ts","dependencies":{},"browser":{"fs":false,"path":false}}');

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccessibilityOverlay: () => (/* reexport safe */ _accessibilityOverlay__WEBPACK_IMPORTED_MODULE_1__.AccessibilityOverlay),
/* harmony export */   CHECK_STATE_MASK: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.CHECK_STATE_MASK),
/* harmony export */   CHECK_STATE_OFFSET: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.CHECK_STATE_OFFSET),
/* harmony export */   SemanticActionType: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType),
/* harmony export */   SemanticCheckState: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticCheckState),
/* harmony export */   SemanticMode: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticMode),
/* harmony export */   SemanticRole: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole),
/* harmony export */   SemanticState: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState),
/* harmony export */   SemanticTrait: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait),
/* harmony export */   SemanticTreeModel: () => (/* reexport safe */ _semanticTreeModel__WEBPACK_IMPORTED_MODULE_0__.SemanticTreeModel),
/* harmony export */   checkStateOf: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.checkStateOf),
/* harmony export */   hasState: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.hasState),
/* harmony export */   hasTrait: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.hasTrait),
/* harmony export */   roleName: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.roleName),
/* harmony export */   stateNames: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.stateNames),
/* harmony export */   traitNames: () => (/* reexport safe */ _types__WEBPACK_IMPORTED_MODULE_2__.traitNames)
/* harmony export */ });
/* harmony import */ var _semanticTreeModel__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8);
/* harmony import */ var _accessibilityOverlay__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(10);
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9);





/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SemanticTreeModel: () => (/* binding */ SemanticTreeModel)
/* harmony export */ });
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

/**
 * Maintains an in-memory semantic tree built from incremental
 * {@link SemanticsDiff} updates received each frame from the WASM runtime.
 *
 * Processing order within {@link applyDiff} follows the contract defined in
 * `semantic_snapshot.hpp`: removed → added → moved → childrenUpdated →
 * updatedSemantic → updatedGeometry.
 */
var SemanticTreeModel = /** @class */ (function () {
    function SemanticTreeModel() {
        this._nodesById = new Map();
        this._roots = [];
        this._semanticVersion = 0;
        this._geometryVersion = 0;
        this._geometryChangedIds = new Set();
        this._semanticChangedIds = new Set();
        this._debug = false;
    }
    Object.defineProperty(SemanticTreeModel.prototype, "nodeCount", {
        get: function () {
            return this._nodesById.size;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SemanticTreeModel.prototype, "semanticVersion", {
        /** Bumped when semantic content or tree structure changes. */
        get: function () {
            return this._semanticVersion;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SemanticTreeModel.prototype, "geometryVersion", {
        /** Bumped when node bounds change without a semantic/structural change. */
        get: function () {
            return this._geometryVersion;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SemanticTreeModel.prototype, "geometryChangedIds", {
        /** Node IDs whose bounds changed in the most recent {@link applyDiff}. */
        get: function () {
            return this._geometryChangedIds;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SemanticTreeModel.prototype, "semanticChangedIds", {
        /**
         * Node IDs whose semantic fields (role/label/value/hint/flags/headingLevel)
         * changed in the most recent {@link applyDiff}. Structural changes (moves,
         * child reorders, removals) bump {@link semanticVersion} but don't mark
         * nodes here — element attributes don't depend on tree position.
         */
        get: function () {
            return this._semanticChangedIds;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SemanticTreeModel.prototype, "roots", {
        /** Root node IDs in sibling order. */
        get: function () {
            return this._roots;
        },
        enumerable: false,
        configurable: true
    });
    /** Look up a node by its ID, or undefined if not in the tree. */
    SemanticTreeModel.prototype.nodeById = function (id) {
        return this._nodesById.get(id);
    };
    /** The node with SemanticState.Focused, or undefined. */
    SemanticTreeModel.prototype.focusedNode = function () {
        // Manual iteration: runs every frame and must stop at the first hit (the
        // TS target forbids for-of over Map iterators).
        var it = this._nodesById.values();
        for (var r = it.next(); !r.done; r = it.next()) {
            if ((0,_types__WEBPACK_IMPORTED_MODULE_0__.hasState)(r.value.stateFlags, _types__WEBPACK_IMPORTED_MODULE_0__.SemanticState.Focused))
                return r.value;
        }
        return;
    };
    /** Current index of a node among its siblings (or roots), or -1 if absent. */
    SemanticTreeModel.prototype.siblingIndexOf = function (id) {
        var node = this._nodesById.get(id);
        if (!node)
            return -1;
        if (node.parentId < 0)
            return this._roots.indexOf(id);
        var parent = this._nodesById.get(node.parentId);
        return parent ? parent.children.indexOf(id) : -1;
    };
    /** Detach a node from its current parent (or from roots). */
    SemanticTreeModel.prototype.detach = function (id) {
        var node = this._nodesById.get(id);
        if (!node)
            return;
        if (node.parentId < 0) {
            var idx = this._roots.indexOf(id);
            if (idx !== -1)
                this._roots.splice(idx, 1);
        }
        else {
            var parent_1 = this._nodesById.get(node.parentId);
            if (parent_1) {
                var idx = parent_1.children.indexOf(id);
                if (idx !== -1)
                    parent_1.children.splice(idx, 1);
            }
        }
    };
    /** Attach a node under a parent at a given sibling index (or as root). */
    SemanticTreeModel.prototype.attach = function (id, parentId, siblingIndex) {
        var node = this._nodesById.get(id);
        if (!node)
            return;
        if (parentId < 0) {
            node.parentId = -1;
            var idx = clamp(siblingIndex, 0, this._roots.length);
            this._roots.splice(idx, 0, id);
        }
        else {
            var parent_2 = this._nodesById.get(parentId);
            if (!parent_2) {
                node.parentId = -1;
                this._roots.push(id);
            }
            else {
                node.parentId = parentId;
                var idx = clamp(siblingIndex, 0, parent_2.children.length);
                parent_2.children.splice(idx, 0, id);
            }
        }
    };
    /** Recursively remove a node and all descendants. */
    SemanticTreeModel.prototype.removeSubtree = function (id) {
        var node = this._nodesById.get(id);
        if (!node)
            return;
        // Copy children array — we're mutating during traversal
        var kids = __spreadArray([], node.children, true);
        for (var _i = 0, kids_1 = kids; _i < kids_1.length; _i++) {
            var child = kids_1[_i];
            this.removeSubtree(child);
        }
        this.detach(id);
        this._nodesById.delete(id);
    };
    /**
     * Apply an incremental diff to the tree. Bumps version counters and notifies
     * listeners only when the tree actually changed.
     *
     * No-op diffs (field values identical to current model) do not bump
     * versions — the native side guards against emitting these, but applyDiff
     * defends its subscribers regardless.
     */
    SemanticTreeModel.prototype.applyDiff = function (diff) {
        var _a, _b;
        var _this = this;
        this._geometryChangedIds.clear();
        this._semanticChangedIds.clear();
        var semanticChanged = false;
        var geometryChanged = false;
        var markSemantic = function () {
            semanticChanged = true;
        };
        var markSemanticNode = function (id) {
            semanticChanged = true;
            _this._semanticChangedIds.add(id);
        };
        var markGeometry = function (id) {
            geometryChanged = true;
            _this._geometryChangedIds.add(id);
        };
        // 1. removed
        for (var _i = 0, _c = diff.removed; _i < _c.length; _i++) {
            var id = _c[_i];
            if (this._nodesById.has(id)) {
                this.removeSubtree(id);
                markSemantic();
            }
        }
        // 2. added
        for (var _d = 0, _e = diff.added; _d < _e.length; _d++) {
            var n = _e[_d];
            var existing = this._nodesById.get(n.id);
            if (existing) {
                if (semanticFieldsDiffer(existing, n)) {
                    applySemantic(existing, n);
                    markSemanticNode(n.id);
                }
                if (geometryFieldsDiffer(existing, n)) {
                    applyGeometry(existing, n);
                    markGeometry(n.id);
                }
            }
            else {
                this._nodesById.set(n.id, nodeFromDiff(n));
                markSemanticNode(n.id);
                markGeometry(n.id);
            }
            this.detach(n.id);
            this.attach(n.id, n.parentId, n.siblingIndex);
        }
        // 3. moved
        // The runtime emits a node as "moved" when its parentId OR siblingIndex
        // changes, so a reorder-only move (same parent, new index) is still a
        // structural/semantic change. Compare the actual position before and after
        // re-attaching so that geometry-only or no-op moves don't bump the semantic
        // version (which would defeat the semantic/geometry version split).
        for (var _f = 0, _g = diff.moved; _f < _g.length; _f++) {
            var n = _g[_f];
            var existing = this._nodesById.get(n.id);
            if (!existing)
                continue;
            var parentChanged = existing.parentId !== n.parentId;
            var oldIndex = this.siblingIndexOf(n.id);
            var geomChanged = geometryFieldsDiffer(existing, n);
            if (geomChanged) {
                applyGeometry(existing, n);
                markGeometry(n.id);
            }
            this.detach(n.id);
            this.attach(n.id, n.parentId, n.siblingIndex);
            if (parentChanged || this.siblingIndexOf(n.id) !== oldIndex) {
                markSemantic();
            }
        }
        // 4. childrenUpdated
        for (var _h = 0, _j = diff.childrenUpdated; _h < _j.length; _h++) {
            var update = _j[_h];
            if (update.parentId < 0) {
                var next = update.childIds.filter(function (id) { return _this._nodesById.has(id); });
                if (!arraysEqual(this._roots, next)) {
                    this._roots.length = 0;
                    (_a = this._roots).push.apply(_a, next);
                    for (var _k = 0, _l = this._roots; _k < _l.length; _k++) {
                        var id = _l[_k];
                        var node = this._nodesById.get(id);
                        if (node)
                            node.parentId = -1;
                    }
                    markSemantic();
                }
            }
            else {
                var parent_3 = this._nodesById.get(update.parentId);
                if (!parent_3)
                    continue;
                var next = update.childIds.filter(function (id) { return _this._nodesById.has(id); });
                if (!arraysEqual(parent_3.children, next)) {
                    parent_3.children.length = 0;
                    (_b = parent_3.children).push.apply(_b, next);
                    for (var _m = 0, _o = parent_3.children; _m < _o.length; _m++) {
                        var id = _o[_m];
                        var node = this._nodesById.get(id);
                        if (node)
                            node.parentId = update.parentId;
                    }
                    markSemantic();
                }
            }
        }
        // 5. updatedSemantic — semantic fields updated
        for (var _p = 0, _q = diff.updatedSemantic; _p < _q.length; _p++) {
            var n = _q[_p];
            var existing = this._nodesById.get(n.id);
            if (!existing)
                continue;
            if (!semanticFieldsDiffer(existing, n))
                continue;
            applySemantic(existing, n);
            markSemanticNode(n.id);
        }
        // 6. updatedGeometry — bounds of a semantic node updated
        for (var _r = 0, _s = diff.updatedGeometry; _r < _s.length; _r++) {
            var n = _s[_r];
            var existing = this._nodesById.get(n.id);
            if (!existing)
                continue;
            if (!geometryFieldsDiffer(existing, n))
                continue;
            applyGeometry(existing, n);
            markGeometry(n.id);
        }
        if (!semanticChanged && !geometryChanged)
            return;
        if (semanticChanged)
            this._semanticVersion++;
        if (geometryChanged)
            this._geometryVersion++;
        if (this._debug) {
            this.logDiff(diff, semanticChanged, geometryChanged);
        }
    };
    Object.defineProperty(SemanticTreeModel.prototype, "debug", {
        /** Enable/disable debug logging of diffs to the console. */
        set: function (enabled) {
            this._debug = enabled;
        },
        enumerable: false,
        configurable: true
    });
    SemanticTreeModel.prototype.logDiff = function (diff, semanticChanged, geometryChanged) {
        var lines = [
            "[rive:semantics] semantic v".concat(this._semanticVersion) +
                (geometryChanged ? " geometry v".concat(this._geometryVersion) : "") +
                (semanticChanged ? "" : " (geometry-only)"),
        ];
        for (var _i = 0, _a = diff.removed; _i < _a.length; _i++) {
            var id = _a[_i];
            lines.push("  - removed #".concat(id));
        }
        for (var _b = 0, _c = diff.added; _b < _c.length; _b++) {
            var n = _c[_b];
            lines.push("  + added #".concat(n.id, " ").concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.roleName)(n.role)) +
                (n.label ? " \"".concat(n.label, "\"") : "") +
                " bounds:(".concat(n.minX.toFixed(1), ",").concat(n.minY.toFixed(1), ")-(").concat(n.maxX.toFixed(1), ",").concat(n.maxY.toFixed(1), ")") +
                " states=[".concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.stateNames)(n.stateFlags), "]") +
                " traits=[".concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.traitNames)(n.traitFlags), "]"));
        }
        for (var _d = 0, _e = diff.moved; _d < _e.length; _d++) {
            var n = _e[_d];
            lines.push("  ~ moved #".concat(n.id, " \u2192 parent=").concat(n.parentId, " idx=").concat(n.siblingIndex) +
                " bounds:(".concat(n.minX.toFixed(1), ",").concat(n.minY.toFixed(1), ")-(").concat(n.maxX.toFixed(1), ",").concat(n.maxY.toFixed(1), ")"));
        }
        for (var _f = 0, _g = diff.childrenUpdated; _f < _g.length; _f++) {
            var u = _g[_f];
            lines.push("  \u2195 children of ".concat(u.parentId < 0 ? "root" : "#" + u.parentId, ": [").concat(u.childIds.join(", "), "]"));
        }
        for (var _h = 0, _j = diff.updatedSemantic; _h < _j.length; _h++) {
            var n = _j[_h];
            lines.push("  \u270E semantic #".concat(n.id, " ").concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.roleName)(n.role)) +
                (n.label ? " \"".concat(n.label, "\"") : "") +
                " states=[".concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.stateNames)(n.stateFlags), "]") +
                " traits=[".concat((0,_types__WEBPACK_IMPORTED_MODULE_0__.traitNames)(n.traitFlags), "]"));
        }
        for (var _k = 0, _l = diff.updatedGeometry; _k < _l.length; _k++) {
            var n = _l[_k];
            lines.push("  \u229E geometry #".concat(n.id, " (").concat(n.minX.toFixed(1), ",").concat(n.minY.toFixed(1), ")-(").concat(n.maxX.toFixed(1), ",").concat(n.maxY.toFixed(1), ")"));
        }
        console.log(lines.join("\n"));
    };
    /**
     * Returns every node in depth-first order, paired with its depth level.
     * Useful for debug logging / rendering a flat list.
     */
    SemanticTreeModel.prototype.flattened = function () {
        var _this = this;
        var out = [];
        var walk = function (id, depth) {
            var node = _this._nodesById.get(id);
            if (!node)
                return;
            out.push({ depth: depth, node: node });
            for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                var child = _a[_i];
                walk(child, depth + 1);
            }
        };
        for (var _i = 0, _a = this._roots; _i < _a.length; _i++) {
            var root = _a[_i];
            walk(root, 0);
        }
        return out;
    };
    return SemanticTreeModel;
}());

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
function nodeFromDiff(n) {
    return {
        id: n.id,
        parentId: -1,
        role: n.role,
        label: n.label,
        value: n.value,
        hint: n.hint,
        stateFlags: n.stateFlags,
        traitFlags: n.traitFlags,
        headingLevel: n.headingLevel,
        minX: n.minX,
        minY: n.minY,
        maxX: n.maxX,
        maxY: n.maxY,
        children: [],
    };
}
/** Compare role/label/value/hint/stateFlags/traitFlags/headingLevel. */
function semanticFieldsDiffer(a, b) {
    return (a.role !== b.role ||
        a.label !== b.label ||
        a.value !== b.value ||
        a.hint !== b.hint ||
        a.stateFlags !== b.stateFlags ||
        a.traitFlags !== b.traitFlags ||
        a.headingLevel !== b.headingLevel);
}
/** Compare only bounds (minX/minY/maxX/maxY). */
function geometryFieldsDiffer(a, b) {
    return (a.minX !== b.minX ||
        a.minY !== b.minY ||
        a.maxX !== b.maxX ||
        a.maxY !== b.maxY);
}
function applySemantic(target, src) {
    target.role = src.role;
    target.label = src.label;
    target.value = src.value;
    target.hint = src.hint;
    target.stateFlags = src.stateFlags;
    target.traitFlags = src.traitFlags;
    target.headingLevel = src.headingLevel;
}
function applyGeometry(target, src) {
    target.minX = src.minX;
    target.minY = src.minY;
    target.maxX = src.maxX;
    target.maxY = src.maxY;
}


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CHECK_STATE_MASK: () => (/* binding */ CHECK_STATE_MASK),
/* harmony export */   CHECK_STATE_OFFSET: () => (/* binding */ CHECK_STATE_OFFSET),
/* harmony export */   SemanticActionType: () => (/* binding */ SemanticActionType),
/* harmony export */   SemanticCheckState: () => (/* binding */ SemanticCheckState),
/* harmony export */   SemanticMode: () => (/* binding */ SemanticMode),
/* harmony export */   SemanticRole: () => (/* binding */ SemanticRole),
/* harmony export */   SemanticState: () => (/* binding */ SemanticState),
/* harmony export */   SemanticTrait: () => (/* binding */ SemanticTrait),
/* harmony export */   checkStateOf: () => (/* binding */ checkStateOf),
/* harmony export */   hasState: () => (/* binding */ hasState),
/* harmony export */   hasTrait: () => (/* binding */ hasTrait),
/* harmony export */   roleName: () => (/* binding */ roleName),
/* harmony export */   stateNames: () => (/* binding */ stateNames),
/* harmony export */   traitNames: () => (/* binding */ traitNames)
/* harmony export */ });
// ---------------------------------------------------------------------------
// SemanticRole — mirrors rive::SemanticRole
// ---------------------------------------------------------------------------
var SemanticRole = {
    none: 0,
    button: 1,
    link: 2,
    checkbox: 3,
    switchControl: 4,
    slider: 5,
    textField: 6,
    text: 7,
    image: 8,
    group: 9,
    list: 10,
    listItem: 11,
    tab: 12,
    tabList: 13,
    dialog: 14,
    alertDialog: 15,
    radioGroup: 16,
    radioButton: 17,
};
// ---------------------------------------------------------------------------
// SemanticState — mirrors rive::SemanticState bitmask
//
// Bits 0-7 are trait-gated (only meaningful when the corresponding
// SemanticTrait is set). Bits 8-13 are non-trait states.
//
// Check state is the exception: it is a two-bit *field* at bits 2-3 rather
// than a flag, because a checkbox is tri-state. It is not a member of this
// table — read it with checkStateOf().
// ---------------------------------------------------------------------------
var SemanticState = {
    None: 0,
    // Trait-gated
    Expanded: 1 << 0, // requires Expandable
    Selected: 1 << 1, // requires Selectable
    // Bits 2-3 are the check state field, not independent flags -- see SemanticCheckState.
    Toggled: 1 << 4, // requires Toggleable
    Required: 1 << 5, // requires Requirable
    Disabled: 1 << 6, // requires Enablable
    Focused: 1 << 7, // requires Focusable
    // Non-trait
    Hidden: 1 << 8,
    LiveRegion: 1 << 9,
    ReadOnly: 1 << 10,
    Modal: 1 << 11,
    Obscured: 1 << 12,
    Multiline: 1 << 13,
};
function hasState(flags, state) {
    return (flags & state) !== 0;
}
// SemanticCheckState — mirrors rive::SemanticCheckState
//
// The tri-state of a checkable node. Occupies two bits of stateFlags at
// CHECK_STATE_OFFSET, so it is read as a value rather than tested as a flag.
// Only meaningful when the Checkable trait is set.
var SemanticCheckState = {
    Unchecked: 0,
    Checked: 1,
    Mixed: 2,
};
/** Bit offset of the check field within stateFlags. */
var CHECK_STATE_OFFSET = 2;
/** Mask of the check field within stateFlags. */
var CHECK_STATE_MASK = 3 << CHECK_STATE_OFFSET;
/**
 * Decodes the check field out of `flags`. The field is two bits. Returns 0, 1, or 2
 * per the mapping in SemanticCheckState.
 */
function checkStateOf(flags) {
    var value = (flags & CHECK_STATE_MASK) >> CHECK_STATE_OFFSET;
    return value >= SemanticCheckState.Mixed
        ? SemanticCheckState.Mixed
        : value;
}
/**
 * Controls when the instance builds semantic trees and accessibility overlays.
 *
 * - `disabled`: no semantics work.
 * - `enabled`: semantics and overlay are active immediately after load.
 */
var SemanticMode = {
    Disabled: "disabled",
    Enabled: "enabled",
};
// ---------------------------------------------------------------------------
// SemanticTrait — mirrors rive::SemanticTrait bitmask
//
// Traits declare what *capabilities* a node has. A state flag is only
// meaningful when its corresponding trait is set.
// ---------------------------------------------------------------------------
var SemanticTrait = {
    None: 0,
    Expandable: 1 << 0,
    Selectable: 1 << 1,
    Checkable: 1 << 2,
    Toggleable: 1 << 3,
    Requirable: 1 << 4,
    Enablable: 1 << 5,
    Focusable: 1 << 6,
};
function hasTrait(flags, trait) {
    return (flags & trait) !== 0;
}
// ---------------------------------------------------------------------------
// SemanticActionType — mirrors rive::SemanticActionType
// ---------------------------------------------------------------------------
var SemanticActionType = {
    tap: 0,
    increase: 1,
    decrease: 2,
};
// ---------------------------------------------------------------------------
// Helpers — readable names for bitmask flags
// ---------------------------------------------------------------------------
var _roleNames = {};
for (var _i = 0, _a = Object.entries(SemanticRole); _i < _a.length; _i++) {
    var _b = _a[_i], name_1 = _b[0], val = _b[1];
    _roleNames[val] = name_1;
}
var _stateEntries = Object.entries(SemanticState).filter(function (_a) {
    var v = _a[1];
    return v !== 0;
});
var _traitEntries = Object.entries(SemanticTrait).filter(function (_a) {
    var v = _a[1];
    return v !== 0;
});
function roleName(role) {
    var _a;
    return (_a = _roleNames[role]) !== null && _a !== void 0 ? _a : "unknown(".concat(role, ")");
}
function stateNames(flags) {
    if (flags === 0)
        return "none";
    var active = [];
    for (var _i = 0, _stateEntries_1 = _stateEntries; _i < _stateEntries_1.length; _i++) {
        var _a = _stateEntries_1[_i], name_2 = _a[0], bit = _a[1];
        if (flags & bit)
            active.push(name_2);
    }
    switch (checkStateOf(flags)) {
        case SemanticCheckState.Checked:
            active.push("Checked");
            break;
        case SemanticCheckState.Mixed:
            active.push("Mixed");
            break;
    }
    return active.join(", ") || "none";
}
function traitNames(flags) {
    if (flags === 0)
        return "none";
    var active = [];
    for (var _i = 0, _traitEntries_1 = _traitEntries; _i < _traitEntries_1.length; _i++) {
        var _a = _traitEntries_1[_i], name_3 = _a[0], bit = _a[1];
        if (flags & bit)
            active.push(name_3);
    }
    return active.join(", ") || "none";
}


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccessibilityOverlay: () => (/* binding */ AccessibilityOverlay)
/* harmony export */ });
/* harmony import */ var _claimedKeyEvents__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(11);
/* harmony import */ var _utils_canvasOffset__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(12);
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9);



var warnedUnpositionedWrapper = false;
/**
 * Warns once per page when no positioned element sits at or inside the canvas's
 * nearest scroll container: the overlay then can't scroll with the canvas. Reads only.
 */
function warnIfWrapperUnpositioned(canvas) {
    if (warnedUnpositionedWrapper)
        return;
    // Null when detached (or display:none / fixed); nothing to judge yet.
    var offsetParent = canvas.offsetParent;
    if (!offsetParent)
        return;
    var scrolls = function (v) { return v === "auto" || v === "scroll" || v === "overlay"; };
    var scroller = null;
    var el = canvas.parentElement;
    // Bounds pathological nesting.
    var MAX_ANCESTOR_WALK = 32;
    for (var i = 0; el && el !== document.documentElement && i < MAX_ANCESTOR_WALK; i++, el = el.parentElement) {
        var style = getComputedStyle(el);
        if (scrolls(style.overflowX) || scrolls(style.overflowY)) {
            scroller = el;
            break;
        }
    }
    // Only the viewport scrolls: any offsetParent scrolls with the page.
    if (!scroller || scroller.contains(offsetParent))
        return;
    warnedUnpositionedWrapper = true;
    console.warn('[Rive] Semantics: give the element wrapping the <canvas> "position: relative" (or another positioned value) so the semantic overlay scrolls with the canvas. Without it, screen readers may scroll to stale positions when the canvas is inside a scrolling container.');
}
/**
 * Creates and manages an invisible DOM tree overlaying a Rive canvas. This is for
 * screen readers to discover and interact with the Rive content.
 *
 * Each semantic node in the {@link SemanticTreeModel} gets a corresponding
 * DOM element with appropriate ARIA role, states, and action handlers so
 * assistive technologies (i.e. screen readers) can discover
 * and interact with the Rive content.
 *
 * Each node receives a prefixed ID (`id=rive-{instanceId}-sem-{nodeId}`) to avoid host-page ID collisions.
 * The nodeID is Rive's semantic node ID from core runtime.
 * Each node is styled with `pointer-events: none`. Interactive nodes can receive
 * programmatic focus and keydown events without entering the browser Tab order.
 */
var AccessibilityOverlay = /** @class */ (function () {
    function AccessibilityOverlay(options) {
        var _this = this;
        var _a, _b;
        this.elements = new Map();
        /** Visually-hidden description spans keyed by node ID, referenced by aria-describedby. */
        this.descElements = new Map();
        this.lastSemanticVersion = -1;
        this.lastGeometryVersion = -1;
        /** Text elements whose fit-scale needs recomputing, batched per update (see flushTextGeometry). */
        this.pendingTextGeometry = [];
        /** Last measured box-size|text key per text element, to skip redundant re-measures. */
        this.textGeometryKeys = new WeakMap();
        /** Node data last passed to applyAttributes per element; see {@link setEditingHostNode}. */
        this.appliedNodes = new WeakMap();
        this.lastCanvasPositioning = {
            width: -1, height: -1, offsetTop: -1, offsetLeft: -1,
        };
        /**
         * Set when a ResizeObserver/window-resize signals the canvas geometry may have
         * changed, cleared once the transform is re-synced. Lets {@link needsUpdate}
         * report geometry changes without a per-frame `getBoundingClientRect()` reflow.
         * Starts true so the first update computes the transform.
         */
        this._geometryDirty = true;
        /** True while reconciling the DOM (reserved for future focus-sync guards). */
        this.isUpdating = false;
        /** Node whose element the editing host stands in for, or null. */
        this.editingHostNodeId = null;
        /** Semantic version last folded into the editing host's decoration. */
        this.editingHostSemanticVersion = -1;
        /**
         * Single child div of the overlay container that carries the artboard→CSS
         * transform. All semantic node elements are children of this div and express
         * their positions in raw artboard-space coordinates. The CSS transform on
         * this container maps artboard units to CSS pixels in one GPU pass — no
         * per-node matrix multiplication required.
         */
        this.transformContainer = null;
        this._artboardBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        this.repositionTimer = null;
        this.canvasResizeObserver = null;
        this.parentResizeObserver = null;
        /**
         * Detects canvas *position* drift. See {@link observePosition}.
         */
        this.positionObserver = null;
        this._onWindowResize = function () { return _this.scheduleReposition(); };
        this.instanceId = options.instanceId;
        this.fireAction = options.fireAction;
        this.requestFocus = options.requestFocus;
        this.clearFocus = options.clearFocus;
        this.canvas = options.canvas;
        this.semanticsOptions = options.semanticsOptions;
        this.allowFocusInterrupt = (_a = options.allowFocusInterrupt) !== null && _a !== void 0 ? _a : false;
        this.isEditingHostFocused = (_b = options.isEditingHostFocused) !== null && _b !== void 0 ? _b : (function () { return false; });
        this.container = this.createContainer(options.canvas);
        this.attachPositionObservers();
        warnIfWrapperUnpositioned(options.canvas);
    }
    /**
     * Hide the stood-in node's element (no duplicate textbox for AT); re-derive the previous
     * one's aria-hidden.
     */
    AccessibilityOverlay.prototype.setEditingHostNode = function (nodeId) {
        if (this.editingHostNodeId === nodeId)
            return;
        var previous = this.editingHostNodeId;
        this.editingHostNodeId = nodeId;
        if (previous !== null) {
            var previousEl = this.elements.get(previous);
            // Re-derive rather than un-hide: the node may have become Hidden mid-session.
            if (previousEl) {
                var previousNode = this.appliedNodes.get(previousEl);
                if (previousNode && this.isAriaHidden(previousNode)) {
                    setAttr(previousEl, "aria-hidden", "true");
                }
                else {
                    removeAttr(previousEl, "aria-hidden");
                }
            }
        }
        if (nodeId !== null) {
            var el = this.elements.get(nodeId);
            if (el)
                setAttr(el, "aria-hidden", "true");
        }
    };
    /**
     * Describe the focused text field on the host and hide its element; no-op unless
     * semantics changed.
     * @param force - apply even if semantics are unchanged (session start).
     */
    AccessibilityOverlay.prototype.syncEditingHost = function (tree, host, force) {
        var _a;
        if (!force && tree.semanticVersion === this.editingHostSemanticVersion)
            return;
        this.editingHostSemanticVersion = tree.semanticVersion;
        var node = tree.focusedNode();
        if (node === undefined || node.role !== _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField) {
            // Nothing to describe; drop the stale description rather than misname the host.
            if (this.editingHostNodeId !== null) {
                host.resetDecoration();
                this.setEditingHostNode(null);
            }
            return;
        }
        // Every key is passed on every call, nulls included, so nothing survives from
        // the previously described field.
        host.setSecure((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(node.stateFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Obscured));
        host.decorate({
            "aria-label": node.label || null,
            "aria-readonly": (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(node.stateFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.ReadOnly) ? "true" : null,
            "aria-multiline": (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(node.stateFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Multiline) ? "true" : null,
            // Trait-gated to match applyAttributes.
            "aria-required": (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(node.traitFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Requirable) &&
                (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(node.stateFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Required)
                ? "true"
                : null,
            // The hint span applyAttributes maintains (update() runs earlier in the frame).
            "aria-describedby": (node.hint && ((_a = this.descElements.get(node.id)) === null || _a === void 0 ? void 0 : _a.id)) || null,
        });
        this.setEditingHostNode(node.id);
    };
    /** True while the editing host stands in for a node's element. */
    AccessibilityOverlay.prototype.hasEditingHost = function () {
        return this.editingHostNodeId !== null;
    };
    /**
     * Undo the stand-in; if the host still has DOM focus, move it to the focused node's
     * element so AT announces it.
     */
    AccessibilityOverlay.prototype.releaseEditingHost = function (tree, host) {
        var _a;
        host === null || host === void 0 ? void 0 : host.resetDecoration();
        this.setEditingHostNode(null);
        this.editingHostSemanticVersion = -1;
        if (!(host === null || host === void 0 ? void 0 : host.hasDomFocus()))
            return;
        var focusedNodeId = (_a = tree === null || tree === void 0 ? void 0 : tree.focusedNode()) === null || _a === void 0 ? void 0 : _a.id;
        if (focusedNodeId !== undefined)
            this.focusNodeElement(focusedNodeId);
    };
    /** Move DOM focus onto a node's element. No-op for a node with no element. */
    AccessibilityOverlay.prototype.focusNodeElement = function (nodeId) {
        var el = this.elements.get(nodeId);
        if (!el)
            return;
        this.focusElementInPlace(el);
    };
    // The overlay is positioned outside the canvas's scroll chain, so a plain focus()
    // would scroll the root instead; scroll the canvas into view through its real ancestors.
    AccessibilityOverlay.prototype.focusElementInPlace = function (el) {
        var _a, _b;
        this.syncContainerBeforeFocus();
        el.focus({ preventScroll: true });
        (_b = (_a = this.canvas).scrollIntoView) === null || _b === void 0 ? void 0 : _b.call(_a, {
            block: "nearest",
            inline: "nearest",
            behavior: "instant",
        });
        // The scroll moved the canvas; re-align now rather than after the observer throttle.
        this.syncContainerGeometry();
        this.observePosition();
    };
    AccessibilityOverlay.prototype.getSemanticOverlayContainer = function () {
        return this.container;
    };
    // ---- Container lifecycle ----
    // Keep the a11y tree overlay matched to the canvas's position and size:
    // 1. The canvas resized           — ResizeObserver
    // 2. The canvas's parent resized   — ResizeObserver
    // 3. The window resized            — resize event
    // 4. The canvas moved/drifted      — IntersectionObserver (see observePosition)
    AccessibilityOverlay.prototype.attachPositionObservers = function () {
        var _this = this;
        this.canvasResizeObserver = new ResizeObserver(function () { return _this.scheduleReposition(); });
        this.canvasResizeObserver.observe(this.canvas);
        var parent = this.canvas.parentElement;
        if (parent) {
            this.parentResizeObserver = new ResizeObserver(function () { return _this.scheduleReposition(); });
            this.parentResizeObserver.observe(parent);
        }
        window.addEventListener("resize", this._onWindowResize);
        this.observePosition();
    };
    /**
     * Arms an IntersectionObserver whose root box is bounded to the canvas, so it
     * fires when the canvas moves relative to the viewport — position drift that
     * no ResizeObserver reports. Lets us re-sync the overlay container on a move
     * instead of recalculating the canvas bounding box every frame.
     */
    AccessibilityOverlay.prototype.observePosition = function () {
        var _this = this;
        var _a;
        if (typeof IntersectionObserver === "undefined")
            return;
        (_a = this.positionObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.positionObserver = null;
        var rect = this.canvas.getBoundingClientRect();
        // Can't frame a zero-area element; it will re-arm on the next reposition.
        if (!rect.width || !rect.height)
            return;
        // Shrink the viewport root box down to exactly the canvas: a negative inset
        // from each viewport edge to the matching canvas edge, in CSS shorthand
        // order (top, right, bottom, left). Rounded so sub-pixel jitter doesn't trip
        // the 1.0 threshold.
        var insetToPx = function (v) { return "".concat(-Math.round(v), "px"); };
        var rootMargin = [
            rect.top, // top:    viewport top → canvas top
            window.innerWidth - rect.right, // right:  viewport right → canvas right
            window.innerHeight - rect.bottom, // bottom: viewport bottom → canvas bottom
            rect.left, // left:   viewport left → canvas left
        ]
            .map(insetToPx)
            .join(" ");
        // The observer emits an initial notification for the current (contained)
        // state; ignore that and only react to a subsequent move.
        var armed = false;
        this.positionObserver = new IntersectionObserver(function () {
            if (!armed) {
                armed = true;
                return;
            }
            _this.scheduleReposition();
        }, { threshold: 1.0, rootMargin: rootMargin });
        this.positionObserver.observe(this.canvas);
    };
    AccessibilityOverlay.prototype.scheduleReposition = function () {
        var _this = this;
        // A resize/move may have changed canvas size/scale/position; force a
        // transform recompute on the next frame's update.
        this._geometryDirty = true;
        if (this.repositionTimer !== null)
            return;
        this.repositionTimer = setTimeout(function () {
            _this.repositionTimer = null;
            _this.syncContainerGeometry();
            // Re-arm the position observer at the canvas's new location.
            _this.observePosition();
        }, 500); // Throttle to avoid rapid style recalculations
    };
    /** Returns true when the container's size changed (node transforms need recomputing). */
    AccessibilityOverlay.prototype.syncContainerGeometry = function () {
        var rect = this.canvas.getBoundingClientRect();
        var _a = (0,_utils_canvasOffset__WEBPACK_IMPORTED_MODULE_1__.canvasOffset)(this.canvas), top = _a.top, left = _a.left;
        var sizeChanged = rect.width !== this.lastCanvasPositioning.width ||
            rect.height !== this.lastCanvasPositioning.height;
        if (!sizeChanged &&
            top === this.lastCanvasPositioning.offsetTop &&
            left === this.lastCanvasPositioning.offsetLeft)
            return false;
        this.container.style.top = top + "px";
        this.container.style.left = left + "px";
        this.container.style.width = rect.width + "px";
        this.container.style.height = rect.height + "px";
        this.container.tabIndex = -1;
        this.lastCanvasPositioning.width = rect.width;
        this.lastCanvasPositioning.height = rect.height;
        this.lastCanvasPositioning.offsetTop = top;
        this.lastCanvasPositioning.offsetLeft = left;
        return sizeChanged;
    };
    /**
     * Re-align the container right before focusing one of its elements. The position
     * observer re-syncs after scrolling on a throttle; focusing an element while the
     * container is stale would make the browser scroll the page to where it sits.
     */
    AccessibilityOverlay.prototype.syncContainerBeforeFocus = function () {
        if (this.syncContainerGeometry())
            this._geometryDirty = true;
    };
    AccessibilityOverlay.prototype.createContainer = function (canvas) {
        var _a, _b;
        var container = document.createElement("div");
        container.id = "rive-a11y-".concat(this.instanceId);
        container.setAttribute("role", "region");
        container.setAttribute("aria-label", (_b = (_a = this.semanticsOptions) === null || _a === void 0 ? void 0 : _a.riveCanvasLabel) !== null && _b !== void 0 ? _b : "Rive animation");
        // Size to the canvas's CSS layout box, not the parent container.
        var rect = canvas.getBoundingClientRect();
        var _c = (0,_utils_canvasOffset__WEBPACK_IMPORTED_MODULE_1__.canvasOffset)(this.canvas), top = _c.top, left = _c.left;
        container.style.cssText = [
            "position:absolute",
            "top:".concat(top, "px"),
            "left:".concat(left, "px"),
            "line-height:normal",
            "font-size:16px",
            "width:".concat(rect.width, "px"),
            "height:".concat(rect.height, "px"),
            "overflow:hidden",
            "pointer-events:none",
            // Visually hidden but still in the accessibility tree.
            // `display:none` and `visibility:hidden` would hide from AT.
            "opacity:0",
        ].join(";");
        canvas.insertAdjacentElement("afterend", container);
        return container;
    };
    /**
     * Returns what changed since the last update, or null if nothing changed.
     *
     * Callers use this to avoid recomputing the (relatively expensive)
     * artboard→canvas transform on frames where only node bounds changed in the
     * tree: the transform only needs recomputing when `layoutChanged` is true.
     */
    AccessibilityOverlay.prototype.needsUpdate = function (tree) {
        var semanticChanged = tree.semanticVersion !== this.lastSemanticVersion;
        var nodeGeometryChanged = tree.geometryVersion !== this.lastGeometryVersion;
        var layoutChanged = this._geometryDirty || !this.transformContainer;
        if (!semanticChanged && !nodeGeometryChanged && !layoutChanged)
            return null;
        return { semanticChanged: semanticChanged, nodeGeometryChanged: nodeGeometryChanged, layoutChanged: layoutChanged };
    };
    /**
     * Update the overlay DOM to reflect the current state of the semantic tree.
     * Call once per frame after `applyDiff` when {@link needsUpdate} reports a
     * change, when layout/transform inputs are dirty, or when a fresh
     * `forwardMat` is supplied (even if the tree versions are unchanged).
     *
     * @param tree           The in-memory semantic tree model
     * @param forwardMat     Artboard→canvas-pixel transform from `computeAlignment`,
     *                       or null to reuse the existing CSS transform on the
     *                       transform container
     * @param dpr            Device pixel ratio used for the canvas backing store
     * @param artboardBounds The artboard's own bounding rectangle
     */
    AccessibilityOverlay.prototype.update = function (tree, forwardMat, dpr, artboardBounds, change) {
        var overlayChange = change !== null && change !== void 0 ? change : this.needsUpdate(tree);
        if (!overlayChange && forwardMat) {
            overlayChange = {
                semanticChanged: false,
                nodeGeometryChanged: false,
                layoutChanged: true,
            };
        }
        if (!overlayChange)
            return;
        this.performUpdate(tree, forwardMat, dpr, artboardBounds, overlayChange);
    };
    AccessibilityOverlay.prototype.performUpdate = function (tree, forwardMat, dpr, artboardBounds, change) {
        var _a;
        var semanticChanged = change.semanticChanged, nodeGeometryChanged = change.nodeGeometryChanged;
        // Per-node change sets only describe the most recent applyDiff. If more
        // than one semantic version elapsed since our last update (first build,
        // or a diff we never consumed), fall back to re-applying attributes on
        // every node rather than trusting an incomplete set.
        var reapplyAllAttributes = tree.semanticVersion - this.lastSemanticVersion > 1;
        this.lastSemanticVersion = tree.semanticVersion;
        this.lastGeometryVersion = tree.geometryVersion;
        this.isUpdating = true;
        this._artboardBounds = artboardBounds;
        // Container box + artboard transform only run when a fresh forwardMat was
        // supplied (layout/transform dirty). Node-only bounds updates reuse the
        // existing CSS transform and go through updateGeometryForChangedNodes.
        // Skipping syncContainerGeometry here on semantic-only frames avoids a
        // getBoundingClientRect() reflow on every animation frame. The throttled
        // scheduleReposition() path still keeps the container aligned when the page
        // layout shifts.
        if (forwardMat) {
            this.syncContainerGeometry();
            this.syncTransformContainer(forwardMat, dpr, artboardBounds);
            // Transform is now in sync with the latest layout.
            this._geometryDirty = false;
        }
        if (semanticChanged) {
            var rootEl = (_a = this.transformContainer) !== null && _a !== void 0 ? _a : this.container;
            var activeIds_1 = new Set();
            this.rebuildChildren(rootEl, tree.roots, tree, 0, // parentLeft in artboard space (transform container origin)
            0, // parentTop  in artboard space
            activeIds_1, reapplyAllAttributes);
            var staleIds_2 = [];
            this.elements.forEach(function (_el, id) {
                if (!activeIds_1.has(id))
                    staleIds_2.push(id);
            });
            for (var _i = 0, staleIds_1 = staleIds_2; _i < staleIds_1.length; _i++) {
                var id = staleIds_1[_i];
                var el = this.elements.get(id);
                if (el && el.parentNode)
                    el.parentNode.removeChild(el);
                this.elements.delete(id);
                var desc = this.descElements.get(id);
                if (desc && desc.parentNode)
                    desc.parentNode.removeChild(desc);
                this.descElements.delete(id);
            }
        }
        else if (nodeGeometryChanged) {
            this.updateGeometryForChangedNodes(tree);
        }
        // Text scaling needs layout reads; batch them into one pass after all
        // position/attribute writes so each frame forces at most one reflow.
        this.flushTextGeometry();
        this.isUpdating = false;
    };
    /** Remove the overlay from the DOM entirely. */
    AccessibilityOverlay.prototype.destroy = function () {
        var _a, _b, _c;
        if (this.repositionTimer !== null) {
            clearTimeout(this.repositionTimer);
            this.repositionTimer = null;
        }
        window.removeEventListener("resize", this._onWindowResize);
        (_a = this.canvasResizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this.parentResizeObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this.positionObserver) === null || _c === void 0 ? void 0 : _c.disconnect();
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.elements.clear();
        this.descElements.clear();
        this.pendingTextGeometry.length = 0;
    };
    // ---- Tree → DOM reconciliation ----
    /**
     * Reconcile a parent DOM element's children with an ordered list of
     * semantic node IDs. Creates, updates, and reorders elements as needed.
     *
     * Node positions are expressed in artboard-space coordinates. The CSS
     * transform on the transform container maps artboard units to CSS pixels,
     * so no per-node matrix multiplication is required here.
     *
     * @param parentArtboardLeft  Absolute artboard minX of the parent node (0 for roots)
     * @param parentArtboardTop   Absolute artboard minY of the parent node (0 for roots)
     */
    AccessibilityOverlay.prototype.rebuildChildren = function (parentEl, childIds, tree, parentArtboardLeft, parentArtboardTop, activeIds, applyAllAttributes) {
        for (var i = 0; i < childIds.length; i++) {
            var nodeId = childIds[i];
            var nodeData = tree.nodeById(nodeId);
            if (!nodeData)
                continue;
            activeIds.add(nodeId);
            var el = this.elements.get(nodeId);
            var isNew = !el;
            if (!el) {
                el = this.createElement(nodeData);
                this.elements.set(nodeId, el);
            }
            // Attributes are only applied to new elements and nodes whose semantic
            // fields changed in the latest diff. Skipping redundant setAttribute
            // calls eliminates WebKit AX notifications that knock VoiceOver off its
            // current element.
            if (isNew || applyAllAttributes || tree.semanticChangedIds.has(nodeId)) {
                this.applyAttributes(el, nodeData);
            }
            this.applyPosition(el, nodeData, parentArtboardLeft, parentArtboardTop);
            // Only touch the DOM tree if the element isn't already in the correct
            // position. Moving a focused element can blur it and knock AT off the
            // current node.
            var currentChild = parentEl.children[i];
            if (currentChild !== el) {
                if (currentChild) {
                    parentEl.insertBefore(el, currentChild);
                }
                else {
                    parentEl.appendChild(el);
                }
            }
            // Reflect the runtime Focused state into DOM focus. Runs after insertion
            // so the element is attached, and skips elements that already hold focus.
            // The cheap trait/state flag checks gate the (per-node) DOM queries below,
            // so the activeElement/closest/contains walks only run for a node that is
            // actually focusable + focused — not for every node on every frame.
            if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(nodeData.traitFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Focusable) &&
                (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(nodeData.stateFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Focused)) {
                var active = document.activeElement;
                // While focus is inside one of our modal dialogs, don't pull it back
                // out to a background node.
                var focusedModal = active === null || active === void 0 ? void 0 : active.closest('[aria-modal="true"]');
                var trappedByModal = !!focusedModal &&
                    this.container.contains(focusedModal) &&
                    !focusedModal.contains(el);
                // Not while the proxy has focus (would steal the caret, drop the keyboard) nor onto
                // its aria-hidden stand-in.
                if (nodeId !== this.editingHostNodeId &&
                    active !== el &&
                    !trappedByModal &&
                    !this.isEditingHostFocused() &&
                    this.canMoveFocus()) {
                    // No scrollIntoView: this runs on semantic diffs and must not drag the page.
                    this.syncContainerBeforeFocus();
                    el.focus({ preventScroll: true });
                }
            }
            // Recurse into children with this node's absolute artboard position.
            if (nodeData.children.length > 0) {
                this.rebuildChildren(el, nodeData.children, tree, nodeData.minX, nodeData.minY, activeIds, applyAllAttributes);
            }
            // Focus a modal/alert dialog when it first appears (after children are
            // built so the focus target can be resolved from the subtree).
            if (isNew)
                this.autoFocusDialogOnAppear(el, nodeData, tree);
        }
    };
    /**
     * Reposition only the subtrees whose bounds changed in the latest diff.
     * Descendants are included because node CSS positions are parent-relative.
     */
    AccessibilityOverlay.prototype.updateGeometryForChangedNodes = function (tree) {
        var _a, _b;
        for (var _i = 0, _c = Array.from(tree.geometryChangedIds); _i < _c.length; _i++) {
            var nodeId = _c[_i];
            var nodeData = tree.nodeById(nodeId);
            if (!nodeData)
                continue;
            var parentLeft = 0;
            var parentTop = 0;
            var parentEl = (_a = this.transformContainer) !== null && _a !== void 0 ? _a : this.container;
            if (nodeData.parentId >= 0) {
                var parent_1 = tree.nodeById(nodeData.parentId);
                if (parent_1) {
                    parentLeft = parent_1.minX;
                    parentTop = parent_1.minY;
                    parentEl = (_b = this.elements.get(nodeData.parentId)) !== null && _b !== void 0 ? _b : parentEl;
                }
            }
            this.updateNodeGeometrySubtree(tree, nodeId, parentLeft, parentTop, parentEl);
        }
    };
    AccessibilityOverlay.prototype.updateNodeGeometrySubtree = function (tree, nodeId, parentArtboardLeft, parentArtboardTop, _parentEl) {
        var nodeData = tree.nodeById(nodeId);
        if (!nodeData)
            return;
        var el = this.elements.get(nodeId);
        if (!el)
            return;
        this.applyPosition(el, nodeData, parentArtboardLeft, parentArtboardTop);
        for (var _i = 0, _a = nodeData.children; _i < _a.length; _i++) {
            var childId = _a[_i];
            this.updateNodeGeometrySubtree(tree, childId, nodeData.minX, nodeData.minY, el);
        }
    };
    /**
     * Whether the overlay may move focus now. Following focus already inside this
     * instance is always allowed; pulling it in from the host page is gated behind
     * allowFocusInterrupt (from the Rive class).
     */
    AccessibilityOverlay.prototype.canMoveFocus = function () {
        var active = document.activeElement;
        var focusAlreadyInScope = active === this.canvas || this.container.contains(active);
        return focusAlreadyInScope || this.allowFocusInterrupt;
    };
    /**
     * Move focus into a newly appeared modal/alert dialog so screen readers
     * announce and read its content (web ATs don't auto-enter a freshly mounted
     * dialog). Skips when focus can't move (see canMoveFocus) or a descendant
     * already holds it. The dialog's aria-modal keeps focus trapped inside.
     */
    AccessibilityOverlay.prototype.autoFocusDialogOnAppear = function (el, node, tree) {
        var _a;
        if (!isModalDialogRole(node.role, node.stateFlags))
            return;
        if (!this.canMoveFocus())
            return;
        // A descendant already holds focus — don't override it.
        var active = document.activeElement;
        if (active && active !== el && el.contains(active))
            return;
        var target = (_a = this.routeDefaultFocusTarget(node, tree)) !== null && _a !== void 0 ? _a : el;
        if (!target.hasAttribute("tabindex"))
            target.setAttribute("tabindex", "-1");
        if (document.activeElement !== target)
            target.focus({ preventScroll: true });
    };
    /**
     * Resolve the element assistive technologies (AT) should focus on appearance. Walks the subtree
     * depth-first and returns the first focusable node's host element, else the
     * inner <span> of the first labeled leaf. Container and unlabeled nodes are
     * descended into but never focused. Returns null if nothing qualifies.
     */
    AccessibilityOverlay.prototype.routeDefaultFocusTarget = function (node, tree) {
        var _a;
        for (var _i = 0, _b = node.children; _i < _b.length; _i++) {
            var childId = _b[_i];
            var child = tree.nodeById(childId);
            if (!child)
                continue;
            var childEl = this.elements.get(childId);
            // Focusable node → its host element (even if it has children).
            if (childEl && isFocusableNode(child))
                return childEl;
            // Container or unlabeled node → descend without focusing it.
            if (child.children.length > 0 || !child.label) {
                var nested = this.routeDefaultFocusTarget(child, tree);
                if (nested)
                    return nested;
                continue;
            }
            // Labeled leaf → its inner label span.
            if (childEl) {
                return (_a = childEl.querySelector(":scope > span")) !== null && _a !== void 0 ? _a : childEl;
            }
        }
        return null;
    };
    Object.defineProperty(AccessibilityOverlay.prototype, "nodeIdPrefix", {
        // ---- Element creation ----
        /** Shared `id` prefix for all semantic node elements of this instance. */
        get: function () {
            return "rive-".concat(this.instanceId, "-sem-");
        },
        enumerable: false,
        configurable: true
    });
    /** Recover the semantic node ID from an overlay element, or null. */
    AccessibilityOverlay.prototype.nodeIdFromElement = function (el) {
        if (!el.id.startsWith(this.nodeIdPrefix))
            return null;
        var raw = el.id.slice(this.nodeIdPrefix.length);
        // Guard the empty string explicitly: Number("") is 0, not NaN.
        if (!raw)
            return null;
        var id = Number(raw);
        return Number.isNaN(id) ? null : id;
    };
    AccessibilityOverlay.prototype.createElement = function (node) {
        var tag = tagForRole(node.role);
        var el = document.createElement(tag);
        el.id = "".concat(this.nodeIdPrefix).concat(node.id);
        el.style.cssText = BASE_NODE_STYLE;
        if (node.role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.text) {
            // The positioned outer div is the AX element
            // VoiceOver uses for its highlight box; an inner <span> carries the text
            // without position:absolute (which would strip the span from VoiceOver's
            // bounds calculation).
            var textSpan = document.createElement("span");
            textSpan.style.cssText = SPAN_EXP;
            el.appendChild(textSpan);
        }
        this.attachActionHandlers(el, node);
        return el;
    };
    // ---- Action handlers ----
    /**
     * Wire arrow-key roving focus for a group member (tab, radio). Arrow keys
     * move focus to the next/previous member (wrapping), optionally Home/End jump
     * to first/last, and the newly focused member receives a tap action.
     */
    AccessibilityOverlay.prototype.attachRovingNav = function (el, opts) {
        var _this = this;
        el.addEventListener("keydown", function (e) {
            var target = null;
            if (e.key === "ArrowRight" || e.key === "ArrowDown")
                target = "next";
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
                target = "prev";
            else if (opts.includeHomeEnd && e.key === "Home")
                target = "first";
            else if (opts.includeHomeEnd && e.key === "End")
                target = "last";
            if (!target)
                return;
            (0,_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_0__.claimKeyEvent)(e);
            var members = opts.members();
            var idx = members.indexOf(el);
            if (idx < 0)
                return;
            var n = members.length;
            var next = target === "next" ? members[(idx + 1) % n]
                : target === "prev" ? members[(idx - 1 + n) % n]
                    : target === "first" ? members[0]
                        : members[n - 1];
            if (next && next !== el) {
                _this.focusElementInPlace(next);
                var nextId = _this.nodeIdFromElement(next);
                if (nextId !== null)
                    _this.fireAction(nextId, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType.tap);
            }
        });
    };
    AccessibilityOverlay.prototype.attachActionHandlers = function (el, node) {
        var _this = this;
        var role = node.role;
        var nodeId = node.id;
        if (isClickableRole(role)) {
            el.addEventListener("click", function () {
                _this.fireAction(nodeId, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType.tap);
            });
            // Links activate on Enter only (Space scrolls the page per browser
            // convention). All other clickable roles accept both Enter and Space.
            var activationKeys_1 = role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link ? ["Enter"] : ["Enter", " "];
            el.addEventListener("keydown", function (e) {
                if (activationKeys_1.includes(e.key)) {
                    (0,_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_0__.claimKeyEvent)(e);
                    _this.fireAction(nodeId, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType.tap);
                }
            });
        }
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.slider) {
            el.addEventListener("keydown", function (e) {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    (0,_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_0__.claimKeyEvent)(e);
                    _this.fireAction(nodeId, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType.increase);
                }
                else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    (0,_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_0__.claimKeyEvent)(e);
                    _this.fireAction(nodeId, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticActionType.decrease);
                }
            });
        }
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab) {
            this.attachRovingNav(el, {
                includeHomeEnd: true,
                members: function () {
                    var parent = el.parentElement;
                    if (!parent)
                        return [];
                    return Array.from(parent.children).filter(function (c) {
                        return c instanceof HTMLElement && c.getAttribute("role") === "tab";
                    });
                },
            });
        }
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioButton) {
            this.attachRovingNav(el, {
                includeHomeEnd: false,
                members: function () {
                    var _a;
                    var group = (_a = el.closest('[role="radiogroup"]')) !== null && _a !== void 0 ? _a : el.parentElement;
                    if (!group)
                        return [];
                    return Array.from(group.querySelectorAll('[role="radio"]'));
                },
            });
        }
        // Focus handler for nodes with the Focusable trait. When AT focuses an
        // element, notify the C++ runtime so it can update internal focus state
        // (visual focus rings, etc.). Gated on Focusable trait
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(node.traitFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Focusable)) {
            el.addEventListener("focus", function () {
                _this.requestFocus(nodeId);
            });
        }
    };
    // ---- Attribute application ----
    AccessibilityOverlay.prototype.isAriaHidden = function (node) {
        var role = node.role;
        var flags = node.stateFlags;
        // Hide from AT when explicitly hidden, or when an image has no accessible
        // name — a nameless role="img" is a WCAG 1.1.1 violation; treat it as
        // decorative instead.
        var isDecorativeImage = role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.image && !node.label;
        // The <input> proxy is the accessible element for the node it stands in for.
        var isEditingHostStandIn = node.id === this.editingHostNodeId;
        return ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Hidden) ||
            // Obscured text fields stay reachable (value withheld, like a native password input).
            ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Obscured) && role !== _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField) ||
            isDecorativeImage ||
            isEditingHostStandIn);
    };
    AccessibilityOverlay.prototype.applyAttributes = function (el, node) {
        var _a, _b, _c;
        this.appliedNodes.set(el, node);
        var role = node.role;
        var flags = node.stateFlags;
        var traits = node.traitFlags;
        // Role
        var ariaRole = ariaRoleForSemantic(role);
        if (ariaRole) {
            setAttr(el, "role", ariaRole);
        }
        else {
            removeAttr(el, "role");
        }
        // Links: a bare <a> with no href has no link semantics, so set the role
        // explicitly (ariaRoleForSemantic returns null for link → native <a>).
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link) {
            setAttr(el, "role", "link");
        }
        // Tabindex — keep the screen-reader overlay out of the browser's sequential
        // Tab order. Interactive/focusable nodes remain programmatically focusable
        // so AT/runtime focus sync can still target them when needed. List items are
        // included because Mobile Safari won't iterate them otherwise.
        if (isInteractiveRole(role) ||
            (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Focusable) ||
            role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.listItem) {
            setAttr(el, "tabindex", "-1");
        }
        else {
            removeAttr(el, "tabindex");
        }
        // Label / value / hint
        if (node.label) {
            setAttr(el, "aria-label", node.label);
        }
        else {
            removeAttr(el, "aria-label");
        }
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.slider) {
            if (node.value) {
                // aria-valuenow must be numeric; keep the display string (e.g. "75%")
                // in aria-valuetext only.
                var numericValue = parseFloat(node.value);
                if (Number.isFinite(numericValue)) {
                    setAttr(el, "aria-valuenow", String(numericValue));
                }
                else {
                    removeAttr(el, "aria-valuenow");
                }
                setAttr(el, "aria-valuetext", node.value);
            }
            else {
                removeAttr(el, "aria-valuenow");
                removeAttr(el, "aria-valuetext");
            }
            // TODO: aria-valuemin / aria-valuemax are required by ARIA.
            // Defaulting to horizontal; vertical sliders need orientation data from C++.
            setAttr(el, "aria-orientation", "horizontal");
            setBoolAttr(el, "aria-readonly", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.ReadOnly));
        }
        else {
            removeAttr(el, "aria-valuenow");
            removeAttr(el, "aria-valuetext");
            removeAttr(el, "aria-orientation");
            removeAttr(el, "aria-readonly");
        }
        if (node.hint) {
            var descId = "rive-".concat(this.instanceId, "-desc-").concat(node.id);
            var descEl = this.descElements.get(node.id);
            if (!descEl) {
                descEl = document.createElement("span");
                descEl.id = descId;
                descEl.style.cssText = DESC_SPAN_STYLE;
                this.container.appendChild(descEl);
                this.descElements.set(node.id, descEl);
            }
            if (descEl.textContent !== node.hint)
                descEl.textContent = node.hint;
            setAttr(el, "aria-describedby", descId);
        }
        else {
            removeAttr(el, "aria-describedby");
            var staleDesc = this.descElements.get(node.id);
            if (staleDesc) {
                if (staleDesc.parentNode)
                    staleDesc.parentNode.removeChild(staleDesc);
                this.descElements.delete(node.id);
            }
        }
        // Text nodes: use textContent rather than aria-label so screen readers
        // announce the text in virtual/browse mode (aria-label on a bare <span>
        // with no widget role is ignored by some AT in document browse mode).
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.text) {
            var textSpan = (_a = el.querySelector(":scope > span")) !== null && _a !== void 0 ? _a : el;
            var text = (_b = node.label) !== null && _b !== void 0 ? _b : "";
            if (textSpan.textContent !== text)
                textSpan.textContent = text;
            removeAttr(el, "aria-label");
            if (node.headingLevel > 0) {
                setAttr(el, "role", "heading");
                setAttr(el, "aria-level", String(node.headingLevel));
            }
            else {
                // The generic role branch above already cleared role="heading";
                // aria-level must go with it when a heading reverts to plain text.
                removeAttr(el, "aria-level");
            }
        }
        // ---- Trait-gated states ----
        // Only set the ARIA property when the trait is present. When the trait
        // is absent, remove the attribute so AT sees "not applicable" rather
        // than "false".
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Expandable) && ARIA_EXPANDED_ROLES.has(role)) {
            setBoolAttr(el, "aria-expanded", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Expanded));
        }
        else {
            removeAttr(el, "aria-expanded");
        }
        // aria-selected is required on ALL tabs per ARIA spec regardless of trait;
        // for other roles it is trait-gated and guarded to ARIA_SELECTED_ROLES.
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab) {
            setBoolAttr(el, "aria-selected", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Selected));
        }
        else if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Selectable) && ARIA_SELECTED_ROLES.has(role)) {
            setBoolAttr(el, "aria-selected", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Selected));
        }
        else {
            removeAttr(el, "aria-selected");
        }
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Checkable) && ARIA_CHECKED_ROLES.has(role)) {
            // Check state is a tri-state field, but not every checkable role
            // accepts all three values — see ARIA_MIXED_ROLES.
            var checkState = (0,_types__WEBPACK_IMPORTED_MODULE_2__.checkStateOf)(flags);
            if (checkState === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticCheckState.Mixed &&
                ARIA_MIXED_ROLES.has(role)) {
                setAttr(el, "aria-checked", "mixed");
            }
            else {
                setBoolAttr(el, "aria-checked", checkState === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticCheckState.Checked);
            }
        }
        else {
            removeAttr(el, "aria-checked");
        }
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Toggleable)) {
            if (ARIA_PRESSED_ROLES.has(role)) {
                setBoolAttr(el, "aria-pressed", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Toggled));
            }
            else {
                removeAttr(el, "aria-pressed");
            }
            // switch uses aria-checked (not aria-pressed) for its on/off state.
            if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl) {
                setBoolAttr(el, "aria-checked", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Toggled));
            }
        }
        else {
            removeAttr(el, "aria-pressed");
        }
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Requirable) && ARIA_REQUIRED_ROLES.has(role)) {
            setBoolAttr(el, "aria-required", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Required));
        }
        else {
            removeAttr(el, "aria-required");
        }
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(traits, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Enablable)) {
            setBoolAttr(el, "aria-disabled", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Disabled));
        }
        else {
            removeAttr(el, "aria-disabled");
        }
        // ---- Non-trait states ----
        if (this.isAriaHidden(node)) {
            setAttr(el, "aria-hidden", "true");
        }
        else {
            removeAttr(el, "aria-hidden");
        }
        if ((0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.LiveRegion)) {
            setAttr(el, "aria-live", "polite");
        }
        else {
            removeAttr(el, "aria-live");
        }
        // textField-specific
        // TODO: Details here may change once we implement text inputs
        if (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField) {
            setBoolAttr(el, "aria-readonly", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.ReadOnly));
            setBoolAttr(el, "aria-multiline", (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Multiline));
            // Surface the current field value as DOM text so screen readers can
            // announce it. Only safe when the node has no semantic children —
            // setting textContent would remove any child elements from the DOM.
            if (node.children.length === 0) {
                var value = (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Obscured) ? "" : ((_c = node.value) !== null && _c !== void 0 ? _c : "");
                if (el.textContent !== value)
                    el.textContent = value;
            }
            else {
                // A value rendered earlier (before the node had children) must not linger,
                // least of all once the field turns Obscured.
                for (var _i = 0, _d = Array.from(el.childNodes); _i < _d.length; _i++) {
                    var child = _d[_i];
                    if (child.nodeType === Node.TEXT_NODE)
                        child.remove();
                }
            }
        }
        else {
            removeAttr(el, "aria-multiline");
        }
        // alertDialog is always modal per WAI-ARIA; a plain dialog only when the Modal state flag is set.
        if (isModalDialogRole(role, flags)) {
            setAttr(el, "aria-modal", "true");
        }
        else {
            removeAttr(el, "aria-modal");
        }
    };
    // ---- Positioning ----
    /**
     * Positions an element in artboard-space coordinates relative to its parent.
     *
     * Node bounds stay in raw artboard units — the CSS `transform: matrix(...)`
     * on the transform container maps artboard units to CSS pixels in one GPU
     * pass. No per-node forwardMat multiplication or DPR division needed here.
     *
     * Round to whole artboard units before comparing to avoid triggering AX
     * layout notifications from sub-unit floating-point animation jitter.
     */
    AccessibilityOverlay.prototype.applyPosition = function (el, node, parentArtboardLeft, parentArtboardTop) {
        // Clamp each node's rect to the artboard viewport before computing CSS.
        // Without this, nodes whose artboard bounds exceed the artboard (e.g. a
        // scroll list container whose height is the full content, not the viewport)
        // produce CSS heights that overflow the transform container. WebKit then
        // unions all descendant AX rects and extends the container's AX origin
        // above the canvas regardless of overflow:hidden on ancestors.
        var ab = this._artboardBounds;
        var clampedMinX = Math.max(node.minX, ab.minX);
        var clampedMinY = Math.max(node.minY, ab.minY);
        var clampedMaxX = Math.min(node.maxX, ab.maxX);
        var clampedMaxY = Math.min(node.maxY, ab.maxY);
        var elLeft = clampedMinX - parentArtboardLeft;
        var elTop = clampedMinY - parentArtboardTop;
        var elWidth = Math.max(0, clampedMaxX - clampedMinX);
        var elHeight = Math.max(0, clampedMaxY - clampedMinY);
        var tx = Math.round(elLeft);
        var ty = Math.round(elTop);
        var pxWidth = Math.round(elWidth) + "px";
        var pxHeight = Math.round(elHeight) + "px";
        // Use left/top layout properties for positioning. VoiceOver reliably
        // handles layout position + a single ancestor CSS transform (the transform
        // container). Chaining CSS transforms across multiple stacking contexts
        // (transform container → node identity → item translate) caused VoiceOver
        // to compute the correct SIZE but wrong POSITION. Artboard clamping above
        // guarantees tx/ty are always ≥ 0, so the negative-top overflow problem
        // that originally prompted the switch to CSS transforms no longer applies.
        var pxLeft = tx + "px";
        var pxTop = ty + "px";
        if (el.style.left !== pxLeft)
            el.style.left = pxLeft;
        if (el.style.top !== pxTop)
            el.style.top = pxTop;
        if (el.style.width !== pxWidth)
            el.style.width = pxWidth;
        if (el.style.height !== pxHeight)
            el.style.height = pxHeight;
        // Clear any CSS transform from a previous render pass.
        if (el.style.transform)
            el.style.transform = "";
        if (node.role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.text) {
            this.pendingTextGeometry.push(el);
        }
    };
    /**
     * Scale each queued text span to fit its layout box, batched so a frame
     * pays at most one synchronous layout: all measurement-reset writes first,
     * then all rect reads, then all transform writes. Interleaving
     * write→read→write per node would force a reflow per text node instead.
     *
     * Nodes whose box size and text are unchanged since the last pass are
     * skipped entirely (their existing transform is still correct — the scale
     * is a ratio of two rects, so ancestor transform changes cancel out).
     */
    AccessibilityOverlay.prototype.flushTextGeometry = function () {
        var _a;
        if (this.pendingTextGeometry.length === 0)
            return;
        // Phase 1 — writes: reset spans to their natural size for measurement.
        // The previous pass's scale must be cleared, or the rect reads below
        // would measure the scaled span and compound the correction.
        var toMeasure = [];
        for (var _i = 0, _b = this.pendingTextGeometry; _i < _b.length; _i++) {
            var host = _b[_i];
            var span = (_a = host.querySelector(":scope > span")) !== null && _a !== void 0 ? _a : host;
            var key = "".concat(host.style.width, "|").concat(host.style.height, "|").concat(span.textContent);
            if (this.textGeometryKeys.get(host) === key)
                continue;
            span.style.width = "auto";
            span.style.height = "auto";
            span.style.transformOrigin = "0 0";
            span.style.transform = "";
            toMeasure.push({ host: host, span: span, key: key });
        }
        this.pendingTextGeometry.length = 0;
        // Phase 2 — reads: one layout pass covers every rect measurement.
        var transforms = toMeasure.map(function (_a) {
            var host = _a.host, span = _a.span;
            var parentRect = host.getBoundingClientRect();
            var natural = span.getBoundingClientRect();
            if (natural.width > 0 && natural.height > 0) {
                var scaleX = parentRect.width / natural.width;
                var scaleY = parentRect.height / natural.height;
                return "scale(".concat(scaleX, ", ").concat(scaleY, ")");
            }
            return "none";
        });
        // Phase 3 — writes: apply all transforms.
        for (var i = 0; i < toMeasure.length; i++) {
            var _c = toMeasure[i], host = _c.host, span = _c.span, key = _c.key;
            span.style.transform = transforms[i];
            this.textGeometryKeys.set(host, key);
        }
    };
    // ---- Transform container ----
    /**
     * Creates (on first call) and updates the artboard-space transform container.
     *
     * The container is sized to the artboard dimensions and carries a CSS
     * `transform: matrix(...)` that maps artboard coordinates to the canvas's CSS box
     * (forwardMat in backing-store pixels, scaled by CSS size / backing-store size). All semantic
     * node elements are children of this container and use raw artboard
     * coordinates as their CSS `left/top/width/height`, so the CSS compositor
     * applies the artboard→screen mapping in one pass.
     */
    AccessibilityOverlay.prototype.syncTransformContainer = function (forwardMat, dpr, artboardBounds) {
        if (!this.transformContainer) {
            var tc = document.createElement("div");
            tc.style.cssText = [
                "position:absolute",
                "top:0",
                "left:0",
                // overflow:visible — artboard viewport clamping is done per-node in
                // applyPosition
                "overflow:visible",
                "pointer-events:none",
                "transform-origin:0 0",
            ].join(";");
            this.container.appendChild(tc);
            this.transformContainer = tc;
        }
        var w = artboardBounds.maxX - artboardBounds.minX;
        var h = artboardBounds.maxY - artboardBounds.minY;
        this.transformContainer.style.width = Math.round(w) + "px";
        this.transformContainer.style.height = Math.round(h) + "px";
        // Backing-store pixels → CSS pixels. Measured rather than 1/dpr: a canvas can be
        // stretched by CSS, or have a stale backing store after a resize, and the drawn
        // content follows the CSS box either way. Equal to 1/dpr when they match.
        var cssWidth = this.lastCanvasPositioning.width;
        var cssHeight = this.lastCanvasPositioning.height;
        var fallback = 1 / (dpr || 1);
        var sx = this.canvas.width > 0 && cssWidth > 0 ? cssWidth / this.canvas.width : fallback;
        var sy = this.canvas.height > 0 && cssHeight > 0 ? cssHeight / this.canvas.height : fallback;
        var a = forwardMat.xx * sx;
        var b = forwardMat.xy * sy;
        var c = forwardMat.yx * sx;
        var d = forwardMat.yy * sy;
        var tx = forwardMat.tx * sx;
        var ty = forwardMat.ty * sy;
        this.transformContainer.style.transform =
            "matrix(".concat(a, ",").concat(b, ",").concat(c, ",").concat(d, ",").concat(tx, ",").concat(ty, ")");
    };
    return AccessibilityOverlay;
}());

// ---------------------------------------------------------------------------
// Static helpers (module-private)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ARIA attribute eligibility — role sets
//
// Each set lists the Rive roles for which a given ARIA attribute is valid per
// WAI-ARIA 1.2 ("Used in roles" + "Inherits into roles"). The trait-gated
// blocks in applyAttributes check these before setting an attribute so that
// C++ nodes with unexpected trait combinations never produce invalid markup.
//
// To add a new role: append it to the relevant set(s) here — no other changes
// needed in applyAttributes.
// ---------------------------------------------------------------------------
/** aria-expanded: button, link, checkbox, switch (inherits button), tab. */
var ARIA_EXPANDED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.button,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab,
]);
/**
 * aria-selected: tab is the only role in our current set that natively
 * supports it. Tab is also handled by an explicit unconditional branch in
 * applyAttributes (ARIA requires it there regardless of Selectable trait), but
 * the set still lists it so the constraint is visible in one place.
 */
var ARIA_SELECTED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab,
]);
/** aria-checked: checkbox, radio, switch. */
var ARIA_CHECKED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioButton,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl,
]);
/**
 * aria-checked="mixed": checkbox only. ARIA defines checkbox as three-valued
 * (true/false/mixed) but radio and switch as two-valued (true/false), so an
 * indeterminate check state degrades to false for those roles rather than
 * emitting a value they do not support.
 */
var ARIA_MIXED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox,
]);
/**
 * aria-pressed: button only. switch is a button subclass in ARIA but uses
 * aria-checked (not aria-pressed) for its on/off state — it is intentionally
 * excluded here and handled separately in the Toggleable block.
 */
var ARIA_PRESSED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.button,
]);
/** aria-required: checkbox, textbox, radiogroup. */
var ARIA_REQUIRED_ROLES = new Set([
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField,
    _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioGroup,
]);
// ---------------------------------------------------------------------------
/** Style for visually-hidden description spans used with aria-describedby. */
var DESC_SPAN_STYLE = [
    "position:absolute",
    "width:1px",
    "height:1px",
    "overflow:hidden",
    "pointer-events:none",
    "left:-9999px",
].join(";");
var BASE_NODE_STYLE = [
    "position:absolute",
    "pointer-events:none",
    "box-sizing:border-box",
    "overflow:visible",
    "margin:0",
    "padding:0",
    "transform-origin: 0px 0px 0px",
    "border:none",
    "background:transparent",
    "color:transparent",
    // "list-style:none",
].join(";");
var SPAN_EXP = [
    "display:inline-block",
    "white-space:nowrap",
    "pointer-events:none",
].join(";");
/**
 * Attribute writers that skip same-value mutations. Even a no-op setAttribute
 * fires a mutation record, and whether AX layers dedupe those is
 * browser-specific — skipping the write is the only browser-proof guard.
 */
function setAttr(el, attr, value) {
    if (el.getAttribute(attr) !== value)
        el.setAttribute(attr, value);
}
function removeAttr(el, attr) {
    if (el.hasAttribute(attr))
        el.removeAttribute(attr);
}
function setBoolAttr(el, attr, value) {
    setAttr(el, attr, value ? "true" : "false");
}
/** Roles that receive click/Enter/Space action handlers. */
function isClickableRole(role) {
    switch (role) {
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.button:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioButton:
            return true;
        default:
            return false;
    }
}
/** Roles that receive tabindex="-1" for programmatic/AT focus (not Tab order). */
function isInteractiveRole(role) {
    switch (role) {
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.button:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.slider:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioButton:
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField:
            return true;
        default:
            return false;
    }
}
/**
 * A modal/alert dialog: alertDialog is always modal per WAI-ARIA, a plain
 * dialog only when the Modal state flag is set.
 */
function isModalDialogRole(role, flags) {
    return (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.alertDialog ||
        (role === _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.dialog && (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasState)(flags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticState.Modal)));
}
/** Whether a node can receive focus: an interactive role or the Focusable trait. */
function isFocusableNode(node) {
    return (isInteractiveRole(node.role) ||
        (0,_types__WEBPACK_IMPORTED_MODULE_2__.hasTrait)(node.traitFlags, _types__WEBPACK_IMPORTED_MODULE_2__.SemanticTrait.Focusable));
}
/**
 * Choose an HTML tag for a given role. Prefer native semantic elements
 * where they exist — screen readers treat them more reliably than
 * generic elements with ARIA role overrides.
 */
function tagForRole(role) {
    switch (role) {
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link:
            return "a";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.text:
            // The outer div is the positioned AX element VoiceOver measures for its
            // highlight box. The text itself lives in a child <span> (see createElement).
            return "div";
        default:
            return "div";
    }
}
/**
 * Maps a Rive SemanticRole to an ARIA `role` attribute value.
 * Returns null for roles that don't need an explicit role attribute here
 * (e.g. text nodes use an outer div + inner span with textContent; heading
 * role is applied separately when headingLevel > 0).
 */
function ariaRoleForSemantic(role) {
    switch (role) {
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.none:
            // TODO: Role "none" removes the node from the accessibility tree. For now, setting to Group, but maybe we want to switch to "none"
            // or "presentation".
            return "group";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.button:
            return "button";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.link:
            return null; // native <a>
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.checkbox:
            return "checkbox";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.switchControl:
            return "switch";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.slider:
            return "slider";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField:
            return "textbox";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.image:
            return "img";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.group:
            return "group";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.list:
            return "list";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.listItem:
            return "listitem";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tab:
            return "tab";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.tabList:
            return "tablist";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.dialog:
            return "dialog";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.alertDialog:
            return "alertdialog";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioGroup:
            return "radiogroup";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.radioButton:
            return "radio";
        case _types__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.text:
            // Text nodes use <span>; heading role is applied separately
            // when headingLevel > 0.
            return null;
        default:
            return null;
    }
}


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   claimKeyEvent: () => (/* binding */ claimKeyEvent),
/* harmony export */   isKeyEventClaimed: () => (/* binding */ isKeyEventClaimed)
/* harmony export */ });
var claimed = new WeakSet();
/**
 * Marks a key event as handled by a semantic overlay widget (and prevents its
 * default), so the Rive keyboard handler leaves it alone. A plain
 * `defaultPrevented` check can't tell these apart from host-page handlers.
 */
function claimKeyEvent(event) {
    event.preventDefault();
    claimed.add(event);
}
function isKeyEventClaimed(event) {
    return claimed.has(event);
}


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   canvasOffset: () => (/* binding */ canvasOffset)
/* harmony export */ });
/**
 * Canvas offset within its offsetParent, minus the scroll of ancestors in between (they
 * move the canvas, not absolutely positioned siblings).
 */
function canvasOffset(canvas) {
    var top = canvas.offsetTop;
    var left = canvas.offsetLeft;
    var offsetParent = canvas.offsetParent;
    if (!offsetParent)
        return { top: top, left: left };
    for (var el = canvas.parentElement; el && el !== offsetParent; el = el.parentElement) {
        top -= el.scrollTop;
        left -= el.scrollLeft;
    }
    return { top: top, left: left };
}


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AudioAssetWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.AudioAssetWrapper),
/* harmony export */   AudioWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.AudioWrapper),
/* harmony export */   BLANK_URL: () => (/* reexport safe */ _sanitizeUrl__WEBPACK_IMPORTED_MODULE_3__.BLANK_URL),
/* harmony export */   CustomFileAssetLoaderWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.CustomFileAssetLoaderWrapper),
/* harmony export */   FileAssetWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.FileAssetWrapper),
/* harmony export */   FileFinalizer: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.FileFinalizer),
/* harmony export */   FocusSessionState: () => (/* reexport safe */ _registerKeyboardInteractions__WEBPACK_IMPORTED_MODULE_1__.FocusSessionState),
/* harmony export */   FontAssetWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.FontAssetWrapper),
/* harmony export */   FontWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.FontWrapper),
/* harmony export */   GamepadInteractions: () => (/* reexport safe */ _gamepadInteractions__WEBPACK_IMPORTED_MODULE_2__.GamepadInteractions),
/* harmony export */   ImageAssetWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.ImageAssetWrapper),
/* harmony export */   ImageWrapper: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.ImageWrapper),
/* harmony export */   KeyboardInteractions: () => (/* reexport safe */ _registerKeyboardInteractions__WEBPACK_IMPORTED_MODULE_1__.KeyboardInteractions),
/* harmony export */   ReplayPacer: () => (/* reexport safe */ _replayPacer__WEBPACK_IMPORTED_MODULE_6__.ReplayPacer),
/* harmony export */   RiveFont: () => (/* reexport safe */ _riveFont__WEBPACK_IMPORTED_MODULE_5__.RiveFont),
/* harmony export */   createFinalization: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.createFinalization),
/* harmony export */   finalizationRegistry: () => (/* reexport safe */ _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__.finalizationRegistry),
/* harmony export */   registerTouchInteractions: () => (/* reexport safe */ _registerTouchInteractions__WEBPACK_IMPORTED_MODULE_0__.registerTouchInteractions),
/* harmony export */   sanitizeUrl: () => (/* reexport safe */ _sanitizeUrl__WEBPACK_IMPORTED_MODULE_3__.sanitizeUrl)
/* harmony export */ });
/* harmony import */ var _registerTouchInteractions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(14);
/* harmony import */ var _registerKeyboardInteractions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(16);
/* harmony import */ var _gamepadInteractions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19);
/* harmony import */ var _sanitizeUrl__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(21);
/* harmony import */ var _finalizationRegistry__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(22);
/* harmony import */ var _riveFont__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(23);
/* harmony import */ var _replayPacer__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(24);









/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerTouchInteractions: () => (/* binding */ registerTouchInteractions)
/* harmony export */ });
/* harmony import */ var _wheelMomentum__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(15);
var _this = undefined;

// A detented wheel reports lines; the runtime wants pixels.
var PIXELS_PER_LINE = 16;
// ScrollPhase.update and ScrollPhase.momentum. The DOM reports no gesture
// phase, so the runtime closes the gesture once it goes quiet.
var SCROLL_PHASE_UPDATE = 1;
var SCROLL_PHASE_MOMENTUM = 3;
/**
 * Pointer state per canvas. It outlives a single registration, because Rive
 * re-registers the listeners (on play and pause) while a finger can still be
 * down, or between a right press and its context menu event.
 */
var touchStateByCanvas = new WeakMap();
/**
 * Extracts ClientCoordinates from a TouchList, respecting multi-touch vs.
 * single-touch mode. In single-touch mode, only the touch matching
 * primaryTouchId is returned (or the first touch when primaryTouchId is null).
 */
var getTouchCoordinates = function (changedTouches, enableMultiTouch, primaryTouchId) {
    var _a;
    var coordinates = [];
    if (enableMultiTouch) {
        for (var i = 0; i < changedTouches.length; i++) {
            var touch = changedTouches[i];
            coordinates.push({
                clientX: touch.clientX,
                clientY: touch.clientY,
                identifier: touch.identifier,
            });
        }
    }
    else {
        // In "single-touch mode", only track the primary finger identified at touchstart.
        // Search changedTouches for the touch matching the recorded primary touch identifier, or (on initial touchstart)
        // take the first available touch identifier.
        var primaryTouch = primaryTouchId !== null
            ? (_a = Array.from(changedTouches).find(function (t) { return t.identifier === primaryTouchId; })) !== null && _a !== void 0 ? _a : null
            : changedTouches[0];
        if (primaryTouch) {
            coordinates.push({
                clientX: primaryTouch.clientX,
                clientY: primaryTouch.clientY,
                identifier: primaryTouch.identifier,
            });
        }
    }
    return coordinates;
};
/** Rive's PointerButton values, which differ from the DOM's MouseEvent.button. */
var RivePointerButton = {
    primary: 0,
    secondary: 1,
    middle: 2,
};
/**
 * The runtime's PointerButton for each DOM MouseEvent.button (left 0,
 * middle 1, right 2), which numbers middle and right the other way round.
 */
var DOM_TO_POINTER_BUTTON = [
    RivePointerButton.primary, // DOM 0: left
    RivePointerButton.middle, // DOM 1: middle
    RivePointerButton.secondary, // DOM 2: right
];
/**
 * The pointer button a press or release is for, as the runtime numbers them.
 * Touch is always primary. Null for buttons a listener can't be bound to, such
 * as back and forward.
 */
var pointerButtonOf = function (event) {
    var _a;
    return event instanceof MouseEvent
        ? ((_a = DOM_TO_POINTER_BUTTON[event.button]) !== null && _a !== void 0 ? _a : null)
        : RivePointerButton.primary;
};
/**
 * Returns the clientX and clientY properties from touch or mouse events. Also
 * calls preventDefault() on the event if it is a touchstart or touchmove to prevent
 * scrolling the page on mobile devices
 * @param event - Either a TouchEvent or a MouseEvent
 * @param isTouchScrollEnabled - Whether touch scrolling is enabled
 * @param enableMultiTouch - Whether to process multiple simultaneous touches
 * @param primaryTouchId - When working with single touches, only process the touch
 *   with this identifier. Pass null to accept any touch (used during touchstart to
 *   capture the first finger down).
 * @returns - Coordinates of the clientX and clientY properties from the touch/mouse event
 */
var getClientCoordinates = function (event, isTouchScrollEnabled, enableMultiTouch, primaryTouchId) {
    var _a;
    var touchEvent = event;
    if ((_a = touchEvent.changedTouches) === null || _a === void 0 ? void 0 : _a.length) {
        // This flag, if false, prevents touch events on the canvas default behavior
        // which may prevent scrolling if a drag motion on the canvas is performed
        if (!isTouchScrollEnabled && ["touchstart", "touchmove"].includes(event.type)) {
            event.preventDefault();
        }
        return getTouchCoordinates(touchEvent.changedTouches, enableMultiTouch, primaryTouchId);
    }
    return [
        {
            clientX: event.clientX,
            clientY: event.clientY,
            identifier: 0,
        },
    ];
};
/**
 * Registers mouse move/up/down and wheel callback handlers on the canvas to send meaningful
 * coordinates to the state machine pointer move/up/down/scroll functions based on cursor
 * interaction
 */
var registerTouchInteractions = function (_a) {
    var _b;
    var canvas = _a.canvas, artboard = _a.artboard, _c = _a.stateMachines, stateMachines = _c === void 0 ? [] : _c, renderer = _a.renderer, rive = _a.rive, fit = _a.fit, alignment = _a.alignment, _d = _a.isTouchScrollEnabled, isTouchScrollEnabled = _d === void 0 ? false : _d, _e = _a.dispatchPointerExit, dispatchPointerExit = _e === void 0 ? true : _e, _f = _a.enableMultiTouch, enableMultiTouch = _f === void 0 ? false : _f, _g = _a.layoutScaleFactor, layoutScaleFactor = _g === void 0 ? 1.0 : _g, advanceAndDrain = _a.advanceAndDrain, wake = _a.wake, summonKeyboard = _a.summonKeyboard, isTextProxyFocused = _a.isTextProxyFocused;
    if (!canvas ||
        !stateMachines.length ||
        !renderer ||
        !rive ||
        !artboard ||
        typeof window === "undefined") {
        return null;
    }
    // A gesture latched before the previous listeners came down (a pause, say)
    // never reached its idle timeout, and would take the next wheel wherever
    // it lands. These instances are live here; at teardown they may not be.
    for (var _i = 0, stateMachines_1 = stateMachines; _i < stateMachines_1.length; _i++) {
        var stateMachine = stateMachines_1[_i];
        stateMachine.cancelScroll();
    }
    /**
     * After a touchend event, some browsers may fire synthetic mouse events
     * (mouseover, mousedown, mousemove, mouseup) if the touch interaction did not cause
     * any default action (such as scrolling).
     *
     * This is done to simulate the behavior of a mouse for applications that do not support
     * touch events.
     *
     * We're keeping track of the previous event to not send the synthetic mouse events if the
     * touch event was a click (touchstart -> touchend).
     *
     * Emulated events only occur when `isTouchScrollEnabled` is true; when false,
     * touchstart is default-prevented, which suppresses them.
     * Emulated mousedown is prevented while the proxy is focused, or it would blur it and
     * drop the keyboard.
     **/
    var _prevEventType = null;
    var _syntheticEventsActive = false;
    /**
     * primaryTouchId: when enableMultiTouch is false ("single-touch mode"),
     * we track the identifier of the first finger that touched down. All
     * subsequent touch events are filtered to this identifier so that a second
     * finger moving cannot displace the tracked pointer position. Reset to null
     * when the primary finger lifts (or touchcancel is called).
     *
     * touches: a cancel may report no position, or none at all for some
     * touches, so it ends them where they were last seen.
     */
    var _touchState = (_b = touchStateByCanvas.get(canvas)) !== null && _b !== void 0 ? _b : {
        touches: new Map(),
        primaryTouchId: null,
        secondaryPressTaken: false,
    };
    touchStateByCanvas.set(canvas, _touchState);
    var _activeTouches = _touchState.touches;
    /**
     * A finger can lift while no listeners are registered (after stop(), say),
     * so its touchend never arrives. A touchstart or touchmove lists every
     * finger still down in `touches`; forget the rest.
     */
    var forgetLiftedTouches = function (_a) {
        var _b;
        var touches = _a.touches, changedTouches = _a.changedTouches;
        if (!touches) {
            return;
        }
        var down = new Set();
        for (var i = 0; i < touches.length; i++) {
            down.add(touches[i].identifier);
        }
        for (var i = 0; i < ((_b = changedTouches === null || changedTouches === void 0 ? void 0 : changedTouches.length) !== null && _b !== void 0 ? _b : 0); i++) {
            down.add(changedTouches[i].identifier);
        }
        _activeTouches.forEach(function (_, identifier) {
            if (!down.has(identifier)) {
                _activeTouches.delete(identifier);
            }
        });
        if (_touchState.primaryTouchId !== null &&
            !down.has(_touchState.primaryTouchId)) {
            _touchState.primaryTouchId = null;
        }
    };
    /**
     * Maps client-space points into Artboard space through the fit and alignment
     * of the canvas.
     */
    var mapToArtboard = function (boundingRect, points) {
        var forwardMatrix = rive.computeAlignment(fit, alignment, {
            minX: 0,
            minY: 0,
            maxX: boundingRect.width,
            maxY: boundingRect.height,
        }, artboard.bounds, layoutScaleFactor);
        var invertedMatrix = new rive.Mat2D();
        forwardMatrix.invert(invertedMatrix);
        var mapped = points.map(function (_a) {
            var clientX = _a.clientX, clientY = _a.clientY;
            var canvasX = clientX - boundingRect.left;
            var canvasY = clientY - boundingRect.top;
            var canvasCoordinatesVector = new rive.Vec2D(canvasX, canvasY);
            var transformedVector = rive.mapXY(invertedMatrix, canvasCoordinatesVector);
            var point = { x: transformedVector.x(), y: transformedVector.y() };
            transformedVector.delete();
            canvasCoordinatesVector.delete();
            return point;
        });
        invertedMatrix.delete();
        forwardMatrix.delete();
        return mapped;
    };
    var processEventCallback = function (event) {
        var _a, _b;
        // Exit early out of all synthetic mouse events
        // https://stackoverflow.com/questions/9656990/how-to-prevent-simulated-mouse-events-in-mobile-browsers
        // https://stackoverflow.com/questions/25572070/javascript-touchend-versus-click-dilemma
        if (_syntheticEventsActive && event instanceof MouseEvent) {
            if (event.type === "mousedown" && (isTextProxyFocused === null || isTextProxyFocused === void 0 ? void 0 : isTextProxyFocused())) {
                event.preventDefault();
            }
            // Synthetic event finished
            if (event.type == "mouseup") {
                _syntheticEventsActive = false;
            }
            return;
        }
        // Test if it's a "touch click". This could cause the browser to send
        // synthetic mouse events.
        _syntheticEventsActive =
            isTouchScrollEnabled &&
                event.type === "touchend" &&
                _prevEventType === "touchstart";
        _prevEventType = event.type;
        var boundingRect = event.currentTarget.getBoundingClientRect();
        if (event.type === "touchstart" || event.type === "touchmove") {
            forgetLiftedTouches(event);
        }
        // On touchstart in single-touch mode, record the first new finger as the primary
        // touch if we aren't already tracking one.
        if (!enableMultiTouch && event.type === "touchstart" && _touchState.primaryTouchId === null) {
            var firstTouch = (_a = event.changedTouches) === null || _a === void 0 ? void 0 : _a[0];
            if (firstTouch) {
                _touchState.primaryTouchId = firstTouch.identifier;
            }
        }
        var coordinateSets = getClientCoordinates(event, isTouchScrollEnabled, enableMultiTouch, enableMultiTouch ? null : _touchState.primaryTouchId);
        var positionedSets = coordinateSets.filter(function (coordinateSet) { return coordinateSet.clientX || coordinateSet.clientY; });
        mapToArtboard(boundingRect, positionedSets).forEach(function (point, i) {
            positionedSets[i].transformedX = point.x;
            positionedSets[i].transformedY = point.y;
        });
        // Only a touchstart the scene saw starts tracking a touch, so a finger
        // that single-touch mode ignored can never be ended by a cancel. Any
        // finger that lifts stops being tracked, whether or not the scene saw it.
        if (event.type === "touchend") {
            var lifted = (_b = event.changedTouches) !== null && _b !== void 0 ? _b : [];
            for (var i = 0; i < lifted.length; i++) {
                _activeTouches.delete(lifted[i].identifier);
            }
        }
        else if (event.type === "touchstart" || event.type === "touchmove") {
            coordinateSets.forEach(function (_a) {
                var clientX = _a.clientX, clientY = _a.clientY, identifier = _a.identifier;
                var tracked = _activeTouches.has(identifier);
                if (event.type === "touchstart" && !tracked) {
                    _activeTouches.set(identifier, { clientX: clientX, clientY: clientY });
                }
                else if (tracked && (clientX || clientY)) {
                    _activeTouches.set(identifier, { clientX: clientX, clientY: clientY });
                }
            });
        }
        var button = pointerButtonOf(event);
        switch (event.type) {
            /**
             * There's a 2px buffer for a hitRadius when translating the pointer coordinates
             * down to the state machine. In cases where the hitbox is about that much away
             * from the Artboard border, we don't have exact precision on determining pointer
             * exit. We're therefore adding to the translated coordinates on mouseout of a canvas
             * to ensure that we report the mouse has truly exited the hitarea.
             * https://github.com/rive-app/rive-cpp/blob/master/src/animation/state_machine_instance.cpp#L336
             *
             */
            case "mouseout":
                var _loop_1 = function (stateMachine) {
                    if (dispatchPointerExit) {
                        coordinateSets.forEach(function (coordinateSet) {
                            stateMachine.pointerExit(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier);
                        });
                    }
                    else {
                        coordinateSets.forEach(function (coordinateSet) {
                            stateMachine.pointerMove(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier);
                        });
                    }
                };
                for (var _i = 0, stateMachines_2 = stateMachines; _i < stateMachines_2.length; _i++) {
                    var stateMachine = stateMachines_2[_i];
                    _loop_1(stateMachine);
                }
                wake === null || wake === void 0 ? void 0 : wake();
                break;
            // Pointer moving/hovering on the canvas
            case "touchmove":
            case "mouseover":
            case "mousemove": {
                var _loop_2 = function (stateMachine) {
                    coordinateSets.forEach(function (coordinateSet) {
                        stateMachine.pointerMove(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier);
                    });
                };
                for (var _c = 0, stateMachines_3 = stateMachines; _c < stateMachines_3.length; _c++) {
                    var stateMachine = stateMachines_3[_c];
                    _loop_2(stateMachine);
                }
                wake === null || wake === void 0 ? void 0 : wake();
                break;
            }
            // Pointer click initiated but not released yet on the canvas
            case "touchstart":
            case "mousedown": {
                if (button === null) {
                    break;
                }
                _touchState.secondaryPressTaken = false;
                var _loop_3 = function (stateMachine) {
                    coordinateSets.forEach(function (_a) {
                        var transformedX = _a.transformedX, transformedY = _a.transformedY, identifier = _a.identifier;
                        // Another button's press goes only where something listens for
                        // it. Elsewhere it belongs to the browser, whose context menu
                        // can keep the release, and would hold the pointer down.
                        if (button !== RivePointerButton.primary &&
                            !stateMachine.listensToButtonAt(transformedX, transformedY, button)) {
                            return;
                        }
                        stateMachine.pointerDown(transformedX, transformedY, identifier, button);
                        _touchState.secondaryPressTaken || (_touchState.secondaryPressTaken = button === RivePointerButton.secondary);
                    });
                };
                for (var _d = 0, stateMachines_4 = stateMachines; _d < stateMachines_4.length; _d++) {
                    var stateMachine = stateMachines_4[_d];
                    _loop_3(stateMachine);
                }
                // Advance the state machine immediately so pointer down(s) takes effect synchronously
                advanceAndDrain(0, { pointerDown: true });
                break;
            }
            // Pointer click released on the canvas
            case "touchend": {
                var _loop_4 = function (stateMachine) {
                    coordinateSets.forEach(function (coordinateSet) {
                        stateMachine.pointerUp(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier);
                        stateMachine.pointerExit(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier);
                    });
                };
                for (var _e = 0, stateMachines_5 = stateMachines; _e < stateMachines_5.length; _e++) {
                    var stateMachine = stateMachines_5[_e];
                    _loop_4(stateMachine);
                }
                // Advance the state machine immediately so pointer up(s) takes effect synchronously
                advanceAndDrain(0);
                // Still inside the touch gesture — summon the keyboard if the tap focused a
                // text input
                summonKeyboard === null || summonKeyboard === void 0 ? void 0 : summonKeyboard();
                // Release the primary touch lock once that finger lifts so the next
                // touchstart can claim a new primary finger.
                if (!enableMultiTouch &&
                    coordinateSets.some(function (c) { return c.identifier === _touchState.primaryTouchId; })) {
                    _touchState.primaryTouchId = null;
                }
                break;
            }
            case "mouseup": {
                if (button === null) {
                    break;
                }
                var _loop_5 = function (stateMachine) {
                    coordinateSets.forEach(function (coordinateSet) {
                        stateMachine.pointerUp(coordinateSet.transformedX, coordinateSet.transformedY, coordinateSet.identifier, button);
                    });
                };
                for (var _f = 0, stateMachines_6 = stateMachines; _f < stateMachines_6.length; _f++) {
                    var stateMachine = stateMachines_6[_f];
                    _loop_5(stateMachine);
                }
                // Advance the state machine immediately so pointer up(s) takes effect synchronously
                advanceAndDrain(0);
                summonKeyboard === null || summonKeyboard === void 0 ? void 0 : summonKeyboard();
                break;
            }
            default:
        }
    };
    /**
     * The browser cancels a touch when the system takes the gesture: a home
     * indicator or edge swipe, an app switch, an alert. Each cancelled touch
     * gets pointerUp then pointerExit, like a lifted finger, so anything
     * waiting for the release doesn't stay pressed. It skips the tap-only side
     * effects (keyboard, emulated mouse events). A page scroll does not cancel
     * the touch in iOS Safari or Android Chrome (it ends with a touchend), so
     * this holds with touch scrolling enabled too.
     */
    var touchCancelCallback = function (event) {
        var _a, _b;
        var cancelled = new Set();
        var changedTouches = (_a = event.changedTouches) !== null && _a !== void 0 ? _a : [];
        for (var i = 0; i < changedTouches.length; i++) {
            var _c = changedTouches[i], identifier = _c.identifier, clientX = _c.clientX, clientY = _c.clientY;
            // Touches the scene never saw (a secondary finger in single-touch
            // mode, or one that already ended) are not tracked.
            if (!_activeTouches.has(identifier)) {
                continue;
            }
            cancelled.add(identifier);
            if (clientX || clientY) {
                _activeTouches.set(identifier, { clientX: clientX, clientY: clientY });
            }
        }
        // A cancel can name only some of the touches, or none. `touches` lists
        // every finger still down, so end any tracked touch missing from it.
        var down = new Set();
        var touches = (_b = event.touches) !== null && _b !== void 0 ? _b : [];
        for (var i = 0; i < touches.length; i++) {
            down.add(touches[i].identifier);
        }
        _activeTouches.forEach(function (_, identifier) {
            if (!down.has(identifier)) {
                cancelled.add(identifier);
            }
        });
        if (_touchState.primaryTouchId === null ||
            cancelled.has(_touchState.primaryTouchId)) {
            _touchState.primaryTouchId = null;
        }
        if (!cancelled.size) {
            return;
        }
        var identifiers = Array.from(cancelled);
        var points = mapToArtboard(event.currentTarget.getBoundingClientRect(), identifiers.map(function (identifier) { return _activeTouches.get(identifier); }));
        identifiers.forEach(function (identifier) { return _activeTouches.delete(identifier); });
        var _loop_6 = function (stateMachine) {
            identifiers.forEach(function (identifier, i) {
                var _a = points[i], x = _a.x, y = _a.y;
                stateMachine.pointerUp(x, y, identifier);
                stateMachine.pointerExit(x, y, identifier);
            });
        };
        for (var _i = 0, stateMachines_7 = stateMachines; _i < stateMachines_7.length; _i++) {
            var stateMachine = stateMachines_7[_i];
            _loop_6(stateMachine);
        }
        // Advance immediately so the release takes effect synchronously
        advanceAndDrain(0);
    };
    /**
     * Keeps the browser's context menu from opening where the content listens
     * to the secondary button, so a right click there goes to Rive alone.
     * Elsewhere the menu opens as usual.
     */
    var contextMenuCallback = function (event) {
        // The press may have moved or hidden its listener before this event, so
        // a right press Rive took keeps the menu closed even with nothing there now.
        if (_touchState.secondaryPressTaken) {
            _touchState.secondaryPressTaken = false;
            event.preventDefault();
            return;
        }
        var point = mapToArtboard(event.currentTarget.getBoundingClientRect(), [event])[0];
        if (stateMachines.some(function (stateMachine) {
            return stateMachine.listensToButtonAt(point.x, point.y, RivePointerButton.secondary);
        })) {
            event.preventDefault();
        }
    };
    /**
     * Forwards wheel and trackpad scrolling to the state machines. The page keeps
     * the wheel unless a scroll view actually moves, so it still scrolls when
     * Rive has nothing to scroll or a view sits at its edge.
     */
    var wheelMomentum = new _wheelMomentum__WEBPACK_IMPORTED_MODULE_0__.WheelMomentumDetector();
    var wheelCallback = function (event) {
        // Pinch zoom arrives as a ctrl+wheel and belongs to the page. A wheel that
        // can't be cancelled is part of a sequence the page is already scrolling;
        // taking it too would move both.
        if (event.ctrlKey || !event.cancelable) {
            wheelMomentum.reset();
            return;
        }
        // Read before the deltas: Firefox reports pixels once a delta has been
        // read first.
        var deltaMode = event.deltaMode;
        var deltaX = event.deltaX;
        var deltaY = event.deltaY;
        // Shift+wheel scrolls sideways. Most browsers already report it on the x
        // axis; a vertical-only view would decline it on y.
        if (event.shiftKey && !deltaX) {
            deltaX = deltaY;
            deltaY = 0;
        }
        var boundingRect = event.currentTarget.getBoundingClientRect();
        // A page is the canvas's visible size, the nearest the host can get to the
        // scroll view's own.
        var toPixelsX = deltaMode === WheelEvent.DOM_DELTA_LINE
            ? PIXELS_PER_LINE
            : deltaMode === WheelEvent.DOM_DELTA_PAGE
                ? boundingRect.width
                : 1;
        var toPixelsY = deltaMode === WheelEvent.DOM_DELTA_LINE
            ? PIXELS_PER_LINE
            : deltaMode === WheelEvent.DOM_DELTA_PAGE
                ? boundingRect.height
                : 1;
        // The DOM reports how far to scroll; the runtime wants how far content
        // travels.
        var scrollX = -deltaX * toPixelsX;
        var scrollY = -deltaY * toPixelsY;
        if (!scrollX && !scrollY) {
            return;
        }
        // Mapping both ends of the delta keeps only the scale of the fit.
        var _a = mapToArtboard(boundingRect, [
            { clientX: event.clientX, clientY: event.clientY },
            { clientX: event.clientX + scrollX, clientY: event.clientY + scrollY },
        ]), position = _a[0], moved = _a[1];
        // The DOM never says whether a pixel delta came from a trackpad, so it
        // counts as precise either way, as it does in the browser's own scrolling.
        var precise = deltaMode === WheelEvent.DOM_DELTA_PIXEL;
        var timeStamp = event.timeStamp / 1000;
        // Momentum bounces at the end of a scroll view; the fingers stretch it.
        var phase = SCROLL_PHASE_UPDATE;
        if (!precise) {
            wheelMomentum.reset();
        }
        else if (wheelMomentum.isMomentum(event, deltaX, deltaY)) {
            phase = SCROLL_PHASE_MOMENTUM;
        }
        // A latched state machine owns the rest of its gesture, even past its edge.
        var latched = stateMachines.filter(function (sm) { return sm.hasScrollLatch(); });
        var ordered = latched.concat(stateMachines.filter(function (sm) { return latched.indexOf(sm) === -1; }));
        var consumed = ordered.some(function (stateMachine) {
            return stateMachine.pointerScroll(position.x, position.y, moved.x - position.x, moved.y - position.y, phase, precise, timeStamp, 0) !== 0;
        });
        if (!consumed) {
            return;
        }
        event.preventDefault();
        // Advance now so the scroll lands on the next frame drawn.
        advanceAndDrain(0);
    };
    var callback = processEventCallback.bind(_this);
    canvas.addEventListener("mouseover", callback);
    canvas.addEventListener("mouseout", callback);
    canvas.addEventListener("mousemove", callback);
    canvas.addEventListener("mousedown", callback);
    canvas.addEventListener("mouseup", callback);
    canvas.addEventListener("touchmove", callback, {
        passive: isTouchScrollEnabled,
    });
    canvas.addEventListener("touchstart", callback, {
        passive: isTouchScrollEnabled,
    });
    canvas.addEventListener("touchend", callback);
    canvas.addEventListener("touchcancel", touchCancelCallback);
    canvas.addEventListener("contextmenu", contextMenuCallback);
    // Not passive, or preventDefault could not keep the page from scrolling.
    canvas.addEventListener("wheel", wheelCallback, { passive: false });
    return function () {
        canvas.removeEventListener("mouseover", callback);
        canvas.removeEventListener("mouseout", callback);
        canvas.removeEventListener("mousemove", callback);
        canvas.removeEventListener("mousedown", callback);
        canvas.removeEventListener("mouseup", callback);
        canvas.removeEventListener("touchmove", callback);
        canvas.removeEventListener("touchstart", callback);
        canvas.removeEventListener("touchend", callback);
        canvas.removeEventListener("touchcancel", touchCancelCallback);
        canvas.removeEventListener("contextmenu", contextMenuCallback);
        canvas.removeEventListener("wheel", wheelCallback);
    };
};


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WheelMomentumDetector: () => (/* binding */ WheelMomentumDetector)
/* harmony export */ });
// The runtime closes a scroll gesture after this long without events.
var GESTURE_GAP_MS = 100;
// Falls, and how far below the peak, before a stream counts as momentum.
var FALLING_EVENTS = 3;
var FALL_FROM_PEAK = 0.15;
// Rises in a row that mean fingers. One alone is two merged events.
var RISING_EVENTS = 2;
// Pixel deltas arrive rounded.
var JITTER = 1;
// Assumed slowest share momentum loses a second; a delta held longer is fingers.
var SLOWEST_DECAY = 0.6;
var HOLD_MARGIN = 1.5;
var SHORTEST_HOLD_MS = 50;
/** Tells the platform's momentum from the fingers in pixel wheel events. */
var WheelMomentumDetector = /** @class */ (function () {
    function WheelMomentumDetector() {
        this.lastTime = -Infinity;
        this.lastX = 0;
        this.lastY = 0;
        // The lowest delta since the last rise, and the peak it fell from.
        this.base = 0;
        this.peak = 0;
        this.falls = 0;
        this.rises = 0;
        this.heldSince = 0;
        this.momentum = false;
    }
    WheelMomentumDetector.prototype.reset = function () {
        this.lastTime = -Infinity;
        this.momentum = false;
    };
    WheelMomentumDetector.prototype.isMomentum = function (event, deltaX, deltaY) {
        // Browsers with WheelEvent.momentum know; the rest leave it to the deltas.
        if ("momentum" in event) {
            return event.momentum === true;
        }
        // Each axis rounds on its own, so the larger one is the size.
        var size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        var time = event.timeStamp;
        var newGesture = time - this.lastTime > GESTURE_GAP_MS ||
            deltaX * this.lastX + deltaY * this.lastY < 0;
        this.lastTime = time;
        this.lastX = deltaX;
        this.lastY = deltaY;
        if (newGesture) {
            this.restart(size, time);
            return false;
        }
        if (size > this.base + JITTER) {
            if (++this.rises >= RISING_EVENTS) {
                this.restart(size, time);
            }
            return this.momentum;
        }
        this.rises = 0;
        var longestHold = (HOLD_MARGIN * 1000) / (SLOWEST_DECAY * size);
        if (size < this.base) {
            this.falls++;
            this.base = size;
            this.heldSince = time;
        }
        else if (time - this.heldSince >
            Math.max(SHORTEST_HOLD_MS, longestHold)) {
            this.restart(size, time);
        }
        if (this.falls >= FALLING_EVENTS &&
            size <= this.peak - Math.max(2 * JITTER, FALL_FROM_PEAK * this.peak)) {
            this.momentum = true;
        }
        return this.momentum;
    };
    WheelMomentumDetector.prototype.restart = function (size, time) {
        this.base = this.peak = size;
        this.falls = this.rises = 0;
        this.heldSince = time;
        this.momentum = false;
    };
    return WheelMomentumDetector;
}());



/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FocusSessionState: () => (/* binding */ FocusSessionState),
/* harmony export */   KeyboardInteractions: () => (/* binding */ KeyboardInteractions)
/* harmony export */ });
/* harmony import */ var _keyMap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);
/* harmony import */ var _semantics_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(11);
/* harmony import */ var _textInputProxy__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(18);



/**
 * Defaults suppressed while typing (scroll/navigate/submit). Tab is traversal's; proxy
 * Space returns earlier as a printable.
 */
var EDITING_NAV_CODES = new Set([
    "Space",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Backspace",
    "Delete",
    "Home",
    "End",
    "Enter",
    "NumpadEnter",
]);
/** A keystroke that types a character (not a Ctrl/Cmd shortcut). */
function isPrintable(event) {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}
function isArrowKey(key) {
    return (key === _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.left || key === _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.right || key === _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.up || key === _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.down);
}
/**
 * Alt/Ctrl/Meta arrows are browser/OS shortcuts (Alt+Left = back, Cmd+Arrow, etc.).
 * Shift is allowed: it is the spatial-navigation chord in Vivaldi/Opera.
 */
function hasShortcutModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey;
}
/**
 * Tracks the relationship between DOM focus inside this Rive focus domain (canvas or semantic overlay)
 * and Rive's internal focus for the current focus session.
 *
 * NotFocused   — DOM focus left the domain, Rive released focus internally, or Tab walked
 *                off the end of the tree. Keyboard input isn't ours, so Tab is ignored and
 *                reaches the next page element.
 * EntryPending — DOM focus is inside the domain but Rive holds no node yet, so the next Tab
 *                enters the focus tree. Set by pointer focus on the canvas, by assistive technology (AT) focus landing
 *                in the overlay, and by keyboard focus whose entry attempt found no eligible node.
 * RiveFocused  — a Rive node holds focus. Tab/Shift+Tab route to the Rive focus manager and stay
 *                inside the domain until either Rive reports focus ended (pollFocusState) or
 *                Tab walks off the edge of the tree (focusNext()/focusPrevious() returns false and
 *                Rive no longer holds focus).
 *
 * Keyboard focus on the canvas enters the tree immediately: onCanvasFocus infers direction from
 * where focus came from and goes straight to RiveFocused when a node accepts.
 */
var FocusSessionState;
(function (FocusSessionState) {
    FocusSessionState["NotFocused"] = "notFocused";
    FocusSessionState["EntryPending"] = "entryPending";
    FocusSessionState["RiveFocused"] = "riveFocused";
})(FocusSessionState || (FocusSessionState = {}));
/**
 * Manages keyboard and DOM focus interactions for Rive's focus domain (<canvas>, semantic
 * overlay, text input proxy). Owns the proxy and the text input session state.
 * Because keyboard events can apply on either part of the domain, we need to track what events we should
 * handle/intercept, and when to release focus back to the page outside of the domain.
 *
 * Tracks the canvas focus session state (focusSessionState) and routes
 * Tab/Shift+Tab to the Rive state machine's focus manager. Exposes shared
 * state as properties so the Rive render loop can read them directly.
 */
var KeyboardInteractions = /** @class */ (function () {
    function KeyboardInteractions(_a) {
        var canvas = _a.canvas, stateMachine = _a.stateMachine, hasFocusNodes = _a.hasFocusNodes, getOverlayElement = _a.getOverlayElement, onInput = _a.onInput;
        var _this = this;
        var _b, _c;
        this.focusSessionState = FocusSessionState.NotFocused;
        /** Whether the canvas currently has browser DOM focus. */
        this.canvasHasFocus = false;
        /** After Tab exits the last Rive node, ignore keydowns until focus re-enters the focus domain. */
        this.focusDomainReleased = false;
        /** Overlay element currently wired with focusin/keydown listeners, if any. */
        this.currentOverlayElement = null;
        /** Codes whose keydown an overlay widget took, so their keyup is skipped too. */
        this.claimedKeyCodes = new Set();
        this.textInputSessionActive = false;
        /**
         * The proxy is always empty: copy Rive's selection; always preventDefault.
         */
        this.onCopy = function (event) {
            var _a;
            event.preventDefault();
            var selected = _this.mainSm.selectedText();
            if (selected)
                (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.setData("text/plain", selected);
        };
        /**
         * Handles the canvas gaining browser focus. The behavior differs based on how focus was gained -
         *
         * Pointer-driven focus: the canvas now has focus but Rive holds nothing yet, so we move to EntryPending — this lets the
         * next Tab enter the focus tree even when the focus is pointer-driven
         *
         * Keyboard-driven focus: we enter the Rive focus tree immediately once canvas gains focus.
         * The direction is inferred from where focus came from: an element before the canvas in DOM order
         * means a forward Tab (focusNext), one after means a Shift+Tab (focusPrevious). :focus-visible
         * gates this so a click doesn't yank Rive focus to the first node on the focus event itself.
         */
        this.onCanvasFocus = function (event) {
            _this.onInput();
            _this.syncOverlayListener();
            _this.canvasHasFocus = true;
            _this.focusDomainReleased = false;
            if (_this.isInFocusDomain(event.relatedTarget) ||
                !_this.hasFocusNodes ||
                _this.mainSm.focusState().hasFocus) {
                return;
            }
            _this.focusSessionState = FocusSessionState.EntryPending;
            // Pointer focus waits for the user's next Tab (handled in onKeyDown). Keyboard focus enters now.
            if (!_this.isKeyboardDrivenFocus())
                return;
            var forward = _this.cameFromBeforeCanvas(event.relatedTarget);
            if (forward ? _this.mainSm.focusNext() : _this.mainSm.focusPrevious()) {
                _this.focusSessionState = FocusSessionState.RiveFocused;
            }
        };
        /**
         * Marks internal state that the canvas has lost DOM focus. Do not actually clear
         * Rive focus though if:
         * 1. DOM focus is still within Rive domain (i.e., semantic overlay)
         * 2. Document just lost focus (i.e. tab switching)
         *
         * When we're not in either of those buckets, it's safe to call `clearFocus()` on the SMI.
         */
        this.onCanvasBlur = function (event) {
            _this.onInput();
            // Must stay before the state reset because beginTextInputSession sets the session state and
            // then focuses the proxy, which synchronously blurs the canvas.
            if (_this.inputProxy.owns(event.relatedTarget))
                return;
            _this.focusSessionState = FocusSessionState.NotFocused;
            _this.canvasHasFocus = false;
            if (_this.blurStaysWithRive(event.relatedTarget))
                return;
            _this.mainSm.clearFocus();
        };
        /**
         * Assistive technology (AT) focus landing inside the overlay is DOM focus inside the Rive focus domain, so open a
         * session even when no Rive node holds focus yet. shouldRiveHandleKeyEvent treats NotFocused
         * as authoritative, so without this the overlay's Tab keydowns reach onKeyDown and get dropped
         * at that gate — the browser would move focus out of Rive instead of to the next focus node.
         */
        this.onOverlayFocusIn = function (event) {
            if (!_this.isInOverlay(event.target))
                return;
            _this.onInput();
            _this.focusDomainReleased = false;
            if (!_this.hasFocusNodes)
                return;
            if (_this.focusSessionState !== FocusSessionState.NotFocused)
                return;
            _this.focusSessionState = _this.mainSm.focusState().hasFocus
                ? FocusSessionState.RiveFocused
                : FocusSessionState.EntryPending;
        };
        /** Overlay listeners attach lazily, so the first focusin only ever lands here. */
        this.onFocusDomainHostFocusIn = function (event) {
            _this.syncOverlayListener();
            _this.onOverlayFocusIn(event);
            // Focus entering the proxy re-enters the focus domain, so clear any earlier Tab-out
            // release, or onKeyDown would drop the session's keystrokes.
            if (_this.inputProxy.owns(event.target)) {
                _this.focusDomainReleased = false;
            }
        };
        /**
         * Handles keydown events in the Rive focus domain. We route certain keys to different functions, with the following
         * fallback behavior:
         * 1. Tab/Shift+Tab - check if keyInput() takes this key, if not, call focusNext/Previous traversal if there are focus nodes
         * 2. Check - if a semantic overlay element's key handler claimed the event, don't intercept the key event further
         * 3. Send key to `keyInput()` on Rive state machine if applicable.
         * 4. If the keyInput returned false, and the key is directional arrow keys, call directional focus methods on state machine
         * 5. Printables: in a session the proxy's input event supplies text; otherwise textInput().
         *    A printable fires both keyInput and textInput even if a listener claims it.
         * @param event KeyboardEvent
         * @returns void
         */
        this.onKeyDown = function (event) {
            _this.onInput();
            _this.syncOverlayListener();
            // Keys that are part of an IME composition belong to the IME (candidate
            // navigation, commit). Safari reports the first one as keyCode 229 with
            // isComposing still false.
            if (event.isComposing || event.keyCode === 229)
                return;
            // After Tab exits the last Rive node, ignore keys until focus re-enters the focus domain.
            if (_this.focusDomainReleased)
                return;
            if (!_this.shouldRiveHandleKeyEvent(event))
                return;
            if (event.key === "Tab" && _this.hasFocusNodes) {
                // Tab listeners are matched per phase (down/repeat/up), as in the editor, so
                // each event is offered on its own; one that isn't claimed traverses.
                if (_this.mainSm.focusState().hasFocus &&
                    _this.mainSm.keyInput(_keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.tab, (0,_keyMap__WEBPACK_IMPORTED_MODULE_0__.modifiersFromEvent)(event), true, event.repeat)) {
                    event.preventDefault();
                    return;
                }
                var forward = !event.shiftKey;
                var focusMoved = forward ? _this.mainSm.focusNext() : _this.mainSm.focusPrevious();
                var focusState = _this.mainSm.focusState();
                // focusMoved is false both at a Stop edge (focus stays put) and after walking off
                // the tree (focus cleared), so hasFocus discerns Stop edge from Rive releasing focus
                if (focusMoved || focusState.hasFocus) {
                    // A Rive node holds focus — keep trapping Tab inside Rive.
                    _this.focusSessionState = FocusSessionState.RiveFocused;
                    event.preventDefault();
                }
                else {
                    // No more traversable nodes — release Tab to the page.
                    if (document.activeElement !== _this.canvas &&
                        _this.isInFocusDomain(document.activeElement)) {
                        // The browser's default Tab starts from the focused element; from an overlay element,
                        // the nearest stop backward is the canvas itself. Start it from the
                        // canvas instead, so a Shift+Tab goes to the proper element before Rive.
                        _this.canvas.focus({ preventScroll: true });
                    }
                    _this.focusSessionState = FocusSessionState.NotFocused;
                    _this.focusDomainReleased = true;
                    _this.canvasHasFocus = false;
                }
                _this.syncOverlayListener();
                return;
            }
            // A semantic overlay widget (roving radio/tab group, slider, Enter/Space activation)
            // already acted on this key at its target, so don't act on it twice.
            if ((0,_semantics_claimedKeyEvents__WEBPACK_IMPORTED_MODULE_1__.isKeyEventClaimed)(event)) {
                _this.claimedKeyCodes.add(event.code);
                return;
            }
            // A new unclaimed press: drop any claim whose keyup never arrived.
            _this.claimedKeyCodes.delete(event.code);
            var fromProxy = _this.textInputSessionActive && _this.inputProxy.owns(event.target);
            var expectsKeyboardInput = _this.mainSm.focusState().expectsKeyboardInput;
            // The focused node gets first refusal (a TextInput's caret, or a keyboard listener
            // on that key). Keys with no Rive equivalent map to null and aren't dispatched.
            var key = (0,_keyMap__WEBPACK_IMPORTED_MODULE_0__.keyboardEventToRiveKey)(event);
            var consumed = key !== null &&
                _this.mainSm.keyInput(key, (0,_keyMap__WEBPACK_IMPORTED_MODULE_0__.modifiersFromEvent)(event), true, event.repeat);
            // An arrow key with no consumed key input moves focus spatially. While a Rive node holds focus,
            // arrows never scroll the page
            if (!consumed && key !== null && isArrowKey(key) && !hasShortcutModifier(event)) {
                consumed =
                    _this.focusInDirection(key) || _this.mainSm.focusState().hasFocus;
            }
            if (isPrintable(event)) {
                // During a session the printable must reach the proxy: its input event is the
                // (IME- and dead-key-correct) text source, and C++ inserts nothing from keyInput.
                if (fromProxy)
                    return;
                // Session live but focus elsewhere in Rive: refocus the proxy so the default inserts there.
                if (_this.textInputSessionActive && _this.isInFocusDomain(event.target)) {
                    _this.inputProxy.focus();
                    return;
                }
                if (!_this.textInputSessionActive && expectsKeyboardInput) {
                    _this.mainSm.textInput(event.key);
                }
            }
            // Rive consumed it, or an unmodified editing key while typing (would scroll/submit).
            var typing = fromProxy || expectsKeyboardInput;
            if (consumed ||
                (typing && !hasShortcutModifier(event) && EDITING_NAV_CODES.has(event.code))) {
                event.preventDefault();
            }
        };
        this.onKeyUp = function (event) {
            _this.onInput();
            if (event.isComposing || event.keyCode === 229)
                return;
            if (_this.claimedKeyCodes.delete(event.code))
                return;
            if (_this.focusSessionState === FocusSessionState.NotFocused)
                return;
            var key = (0,_keyMap__WEBPACK_IMPORTED_MODULE_0__.keyboardEventToRiveKey)(event);
            if (key === null)
                return;
            _this.mainSm.keyInput(key, (0,_keyMap__WEBPACK_IMPORTED_MODULE_0__.modifiersFromEvent)(event), false, false);
        };
        this.canvas = canvas;
        this.onInput = onInput !== null && onInput !== void 0 ? onInput : (function () { });
        this.mainSm = stateMachine;
        this.hasFocusNodes = hasFocusNodes;
        this.getOverlayElement = getOverlayElement;
        this.focusDomainHost = (_b = canvas.parentElement) !== null && _b !== void 0 ? _b : document;
        canvas.addEventListener("focus", this.onCanvasFocus);
        canvas.addEventListener("blur", this.onCanvasBlur);
        canvas.addEventListener("keydown", this.onKeyDown);
        canvas.addEventListener("keyup", this.onKeyUp);
        this.focusDomainHost.addEventListener("focusin", this.onFocusDomainHostFocusIn);
        this.syncOverlayListener();
        this.inputProxy = new _textInputProxy__WEBPACK_IMPORTED_MODULE_2__.TextInputProxy({
            container: (_c = canvas.parentElement) !== null && _c !== void 0 ? _c : document.body,
            canvas: canvas,
            textInput: function (text) {
                _this.onInput();
                return _this.mainSm.textInput(text);
            },
            // Proxy keystrokes go through the same handlers as the canvas.
            onKeyDown: this.onKeyDown,
            onKeyUp: this.onKeyUp,
            onCopy: this.onCopy,
            onBlur: function (relatedTarget) { return _this.handleProxyBlur(relatedTarget); },
        });
    }
    KeyboardInteractions.prototype.isTextInputSessionActive = function () {
        return this.textInputSessionActive;
    };
    /** Session active and the proxy holds DOM focus. */
    KeyboardInteractions.prototype.isEditingHostFocused = function () {
        return this.textInputSessionActive && this.inputProxy.hasDomFocus();
    };
    /** @param focusProxy move DOM focus to the proxy; false leaves it where it is. */
    KeyboardInteractions.prototype.beginTextInputSession = function (focusProxy) {
        this.textInputSessionActive = true;
        this.focusSessionState = FocusSessionState.RiveFocused;
        if (focusProxy)
            this.inputProxy.focus();
    };
    /** @param fromBlur focus is already leaving; don't park it on the canvas. */
    KeyboardInteractions.prototype.endTextInputSession = function (fromBlur) {
        if (fromBlur === void 0) { fromBlur = false; }
        if (!this.textInputSessionActive)
            return;
        this.textInputSessionActive = false;
        this.inputProxy.endSession();
        if (fromBlur || !this.inputProxy.hasDomFocus())
            return;
        // Nothing took DOM focus from the proxy (e.g. semantics is off). Park it on the
        // canvas so keys keep reaching Rive; onCanvasFocus ignores focus from the input proxy.
        this.canvas.focus({ preventScroll: true });
    };
    /** Must run synchronously in the pointer gesture or mobile keyboards won't open. */
    KeyboardInteractions.prototype.summonForPointer = function () {
        if (this.textInputSessionActive)
            this.inputProxy.focus();
        else
            this.beginTextInputSession(true);
    };
    Object.defineProperty(KeyboardInteractions.prototype, "editingHost", {
        /** The text-input proxy, for the semantics layer to decorate while editing. */
        get: function () {
            return this.inputProxy;
        },
        enumerable: false,
        configurable: true
    });
    KeyboardInteractions.prototype.handleProxyBlur = function (relatedTarget) {
        this.onInput();
        // Teardown already in progress (endTextInputSession blurred the proxy).
        if (!this.textInputSessionActive)
            return;
        // Still in Rive or the document blurred: keep the session (pollFocusState tears down).
        if (this.blurStaysWithRive(relatedTarget))
            return;
        // Blurred out of Rive entirely: release C++ focus and end the session.
        this.mainSm.clearFocus();
        this.endTextInputSession(true);
        this.focusSessionState = FocusSessionState.NotFocused;
    };
    /**
     * Set the FocusSessionState. Useful for invoking a Rive "blur" without actually blurring from the <canvas>. This
     * helps put the DOM focus state on the canvas rather than the <body>, so the user doesn't lose the spot in page navigation
     *
     * @param state FocusSessionState enum
     */
    KeyboardInteractions.prototype.setFocusSessionState = function (state) {
        this.focusSessionState = state;
    };
    /**
     * Called by pollFocusState on the Rive instance when it observes hasFocus=true. Rive acquired
     * focus internally (e.g. via a listener action or state transition) without a DOM focus event,
     * so mark the session RiveFocused. This cannot resurrect a session that a DOM blur ended,
     * because onCanvasBlur clears Rive's focus alongside it.
     */
    KeyboardInteractions.prototype.notifyRiveFocused = function () {
        this.focusSessionState = FocusSessionState.RiveFocused;
    };
    /** Blur into the focus domain, or the whole document losing focus (tab/window switch). */
    KeyboardInteractions.prototype.blurStaysWithRive = function (relatedTarget) {
        return (this.isInFocusDomain(relatedTarget) ||
            (relatedTarget === null && !document.hasFocus()));
    };
    /** Arrow keys map to directional focus; anything else is not a focus move. */
    KeyboardInteractions.prototype.focusInDirection = function (key) {
        switch (key) {
            case _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.left:
                return this.mainSm.focusLeft();
            case _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.right:
                return this.mainSm.focusRight();
            case _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.up:
                return this.mainSm.focusUp();
            case _keyMap__WEBPACK_IMPORTED_MODULE_0__.Key.down:
                return this.mainSm.focusDown();
            default:
                return false;
        }
    };
    /**
     * Determine if Rive should handle keyboard input. If session state is `NotFocused` - no.
     * DOM focus stays parked on the canvas after Rive releases focus internally, and that Tab
     * has to reach the page rather than re-enter the tree.
     *
     * Otherwise, the event still has to belong to Rive:
     * 1. If the current DOM focus is in Rive domain (canvas or semantic overlay)
     * 2. If the target for the key input is for the semantic overlay, or the canvas
     */
    KeyboardInteractions.prototype.shouldRiveHandleKeyEvent = function (event) {
        if (this.focusSessionState === FocusSessionState.NotFocused)
            return false;
        var inFocusDomain = this.isInFocusDomain(document.activeElement) ||
            this.isInOverlay(event.target);
        var eventOnCanvas = event.target === this.canvas;
        return inFocusDomain || this.canvasHasFocus || eventOnCanvas;
    };
    /** DOM that counts as inside Rive for focus: canvas, overlay subtree, text-input proxy. */
    KeyboardInteractions.prototype.isInFocusDomain = function (target) {
        if (target === this.canvas)
            return true;
        if (this.inputProxy.owns(target))
            return true;
        return this.isInOverlay(target);
    };
    /** Overlay only (excludes the canvas) — the accessibility overlay subtree. */
    KeyboardInteractions.prototype.isInOverlay = function (target) {
        var _a, _b, _c;
        if (!(target instanceof Node))
            return false;
        return (_c = (_b = (_a = this.getOverlayElement) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.contains(target)) !== null && _c !== void 0 ? _c : false;
    };
    KeyboardInteractions.prototype.syncOverlayListener = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var nextOverlayElement = (_b = (_a = this.getOverlayElement) === null || _a === void 0 ? void 0 : _a.call(this)) !== null && _b !== void 0 ? _b : null;
        if (nextOverlayElement === this.currentOverlayElement)
            return;
        (_c = this.currentOverlayElement) === null || _c === void 0 ? void 0 : _c.removeEventListener("focusin", this.onOverlayFocusIn);
        (_d = this.currentOverlayElement) === null || _d === void 0 ? void 0 : _d.removeEventListener("keydown", this.onKeyDown);
        (_e = this.currentOverlayElement) === null || _e === void 0 ? void 0 : _e.removeEventListener("keyup", this.onKeyUp);
        this.currentOverlayElement = nextOverlayElement;
        (_f = this.currentOverlayElement) === null || _f === void 0 ? void 0 : _f.addEventListener("focusin", this.onOverlayFocusIn);
        // Bubble phase, so a semantic widget's own key handler runs first and can claim
        // the key via claimKeyEvent (see onKeyDown).
        (_g = this.currentOverlayElement) === null || _g === void 0 ? void 0 : _g.addEventListener("keydown", this.onKeyDown);
        (_h = this.currentOverlayElement) === null || _h === void 0 ? void 0 : _h.addEventListener("keyup", this.onKeyUp);
    };
    /**
     * Whether the canvas currently matches :focus-visible — the browser's heuristic for keyboard-
     * (vs pointer-) driven focus. For older browser versions that don't support this selector, return false
     * so that we don't incorrectly assume pointer vs keyboard focus. Next tab would enter the focus tree in those edge cases.
     */
    KeyboardInteractions.prototype.isKeyboardDrivenFocus = function () {
        try {
            return this.canvas.matches(":focus-visible");
        }
        catch (_a) {
            return false;
        }
    };
    KeyboardInteractions.prototype.cameFromBeforeCanvas = function (from) {
        if (!from)
            return true;
        var position = this.canvas.compareDocumentPosition(from);
        if (position & Node.DOCUMENT_POSITION_PRECEDING)
            return true;
        if (position & Node.DOCUMENT_POSITION_FOLLOWING)
            return false;
        return true;
    };
    KeyboardInteractions.prototype.cleanup = function () {
        var _a, _b, _c;
        this.canvas.removeEventListener("focus", this.onCanvasFocus);
        this.canvas.removeEventListener("blur", this.onCanvasBlur);
        this.canvas.removeEventListener("keydown", this.onKeyDown);
        this.canvas.removeEventListener("keyup", this.onKeyUp);
        this.claimedKeyCodes.clear();
        this.focusDomainHost.removeEventListener("focusin", this.onFocusDomainHostFocusIn);
        (_a = this.currentOverlayElement) === null || _a === void 0 ? void 0 : _a.removeEventListener("focusin", this.onOverlayFocusIn);
        (_b = this.currentOverlayElement) === null || _b === void 0 ? void 0 : _b.removeEventListener("keydown", this.onKeyDown);
        (_c = this.currentOverlayElement) === null || _c === void 0 ? void 0 : _c.removeEventListener("keyup", this.onKeyUp);
        // Removing a focused element drops focus to <body> with no blur; park on the canvas.
        if (this.inputProxy.hasDomFocus()) {
            this.canvas.focus({ preventScroll: true });
        }
        this.inputProxy.cleanup();
        this.textInputSessionActive = false;
    };
    return KeyboardInteractions;
}());



/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Key: () => (/* binding */ Key),
/* harmony export */   KeyModifiers: () => (/* binding */ KeyModifiers),
/* harmony export */   keyboardEventToRiveKey: () => (/* binding */ keyboardEventToRiveKey),
/* harmony export */   modifiersFromEvent: () => (/* binding */ modifiersFromEvent)
/* harmony export */ });
/*
 * Maps DOM keyboard events to the GLFW-style key codes and modifier bitmask
 * that StateMachineInstance.keyInput() expects. Values mirror `enum class Key`
 * and `enum class KeyModifiers` in rive-runtime focusable.hpp;
 * they are stable GLFW codes, so they live here as constants instead of an
 * embind enum.
 */
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var Key = {
    space: 32,
    apostrophe: 39, // '
    comma: 44, // ,
    minus: 45, // -
    period: 46, // .
    slash: 47, // /
    key0: 48,
    key1: 49,
    key2: 50,
    key3: 51,
    key4: 52,
    key5: 53,
    key6: 54,
    key7: 55,
    key8: 56,
    key9: 57,
    semicolon: 59, // ;
    equal: 61, // =
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    leftBracket: 91, // [
    backslash: 92, // \
    rightBracket: 93, // ]
    graveAccent: 96, // `
    world1: 161, // non-US #1
    world2: 162, // non-US #2
    escape: 256,
    enter: 257,
    tab: 258,
    backspace: 259,
    insert: 260,
    deleteKey: 261,
    right: 262,
    left: 263,
    down: 264,
    up: 265,
    pageUp: 266,
    pageDown: 267,
    home: 268,
    end: 269,
    capsLock: 280,
    scrollLock: 281,
    numLock: 282,
    printScreen: 283,
    pause: 284,
    f1: 290,
    f2: 291,
    f3: 292,
    f4: 293,
    f5: 294,
    f6: 295,
    f7: 296,
    f8: 297,
    f9: 298,
    f10: 299,
    f11: 300,
    f12: 301,
    f13: 302,
    f14: 303,
    f15: 304,
    f16: 305,
    f17: 306,
    f18: 307,
    f19: 308,
    f20: 309,
    f21: 310,
    f22: 311,
    f23: 312,
    f24: 313,
    f25: 314,
    kp0: 320,
    kp1: 321,
    kp2: 322,
    kp3: 323,
    kp4: 324,
    kp5: 325,
    kp6: 326,
    kp7: 327,
    kp8: 328,
    kp9: 329,
    kpDecimal: 330,
    kpDivide: 331,
    kpMultiply: 332,
    kpSubtract: 333,
    kpAdd: 334,
    kpEnter: 335,
    kpEqual: 336,
    leftShift: 340,
    leftControl: 341,
    leftAlt: 342,
    leftSuper: 343,
    rightShift: 344,
    rightControl: 345,
    rightAlt: 346,
    rightSuper: 347,
    menu: 348,
};
var KeyModifiers = {
    none: 0,
    shift: 1 << 0,
    ctrl: 1 << 1,
    alt: 1 << 2,
    meta: 1 << 3,
};
// Physical key (KeyboardEvent.code) to Rive key, by US-QWERTY position.
var CODE_TO_KEY = {
    // Modifiers are keys too (the editor sends them), and are also in the bitmask.
    ShiftLeft: Key.leftShift,
    ShiftRight: Key.rightShift,
    ControlLeft: Key.leftControl,
    ControlRight: Key.rightControl,
    AltLeft: Key.leftAlt,
    AltRight: Key.rightAlt,
    MetaLeft: Key.leftSuper,
    MetaRight: Key.rightSuper,
    KeyA: Key.a,
    KeyB: Key.b,
    KeyC: Key.c,
    KeyD: Key.d,
    KeyE: Key.e,
    KeyF: Key.f,
    KeyG: Key.g,
    KeyH: Key.h,
    KeyI: Key.i,
    KeyJ: Key.j,
    KeyK: Key.k,
    KeyL: Key.l,
    KeyM: Key.m,
    KeyN: Key.n,
    KeyO: Key.o,
    KeyP: Key.p,
    KeyQ: Key.q,
    KeyR: Key.r,
    KeyS: Key.s,
    KeyT: Key.t,
    KeyU: Key.u,
    KeyV: Key.v,
    KeyW: Key.w,
    KeyX: Key.x,
    KeyY: Key.y,
    KeyZ: Key.z,
    Digit0: Key.key0,
    Digit1: Key.key1,
    Digit2: Key.key2,
    Digit3: Key.key3,
    Digit4: Key.key4,
    Digit5: Key.key5,
    Digit6: Key.key6,
    Digit7: Key.key7,
    Digit8: Key.key8,
    Digit9: Key.key9,
    Numpad0: Key.kp0,
    Numpad1: Key.kp1,
    Numpad2: Key.kp2,
    Numpad3: Key.kp3,
    Numpad4: Key.kp4,
    Numpad5: Key.kp5,
    Numpad6: Key.kp6,
    Numpad7: Key.kp7,
    Numpad8: Key.kp8,
    Numpad9: Key.kp9,
    NumpadDecimal: Key.kpDecimal,
    NumpadDivide: Key.kpDivide,
    NumpadMultiply: Key.kpMultiply,
    NumpadSubtract: Key.kpSubtract,
    NumpadAdd: Key.kpAdd,
    NumpadEnter: Key.kpEnter,
    NumpadEqual: Key.kpEqual,
    Minus: Key.minus,
    Equal: Key.equal,
    BracketLeft: Key.leftBracket,
    BracketRight: Key.rightBracket,
    Backslash: Key.backslash,
    Semicolon: Key.semicolon,
    Quote: Key.apostrophe,
    Backquote: Key.graveAccent,
    Comma: Key.comma,
    Period: Key.period,
    Slash: Key.slash,
    IntlBackslash: Key.world1,
    IntlRo: Key.world2,
    Space: Key.space,
    Enter: Key.enter,
    Tab: Key.tab,
    Backspace: Key.backspace,
    Insert: Key.insert,
    Delete: Key.deleteKey,
    Escape: Key.escape,
    ArrowRight: Key.right,
    ArrowLeft: Key.left,
    ArrowDown: Key.down,
    ArrowUp: Key.up,
    PageUp: Key.pageUp,
    PageDown: Key.pageDown,
    Home: Key.home,
    End: Key.end,
    CapsLock: Key.capsLock,
    ScrollLock: Key.scrollLock,
    NumLock: Key.numLock,
    PrintScreen: Key.printScreen,
    Pause: Key.pause,
    ContextMenu: Key.menu,
    F1: Key.f1,
    F2: Key.f2,
    F3: Key.f3,
    F4: Key.f4,
    F5: Key.f5,
    F6: Key.f6,
    F7: Key.f7,
    F8: Key.f8,
    F9: Key.f9,
    F10: Key.f10,
    F11: Key.f11,
    F12: Key.f12,
    F13: Key.f13,
    F14: Key.f14,
    F15: Key.f15,
    F16: Key.f16,
    F17: Key.f17,
    F18: Key.f18,
    F19: Key.f19,
    F20: Key.f20,
    F21: Key.f21,
    F22: Key.f22,
    F23: Key.f23,
    F24: Key.f24,
    F25: Key.f25,
};
// Unshifted characters (event.key, lowercased) that name a Rive key.
var CHAR_TO_KEY = (function () {
    var map = {
        " ": Key.space,
        "'": Key.apostrophe,
        ",": Key.comma,
        "-": Key.minus,
        ".": Key.period,
        "/": Key.slash,
        ";": Key.semicolon,
        "=": Key.equal,
        "[": Key.leftBracket,
        "\\": Key.backslash,
        "]": Key.rightBracket,
        "`": Key.graveAccent,
    };
    for (var c = 0; c < 26; c++)
        map[String.fromCharCode(97 + c)] = Key.a + c;
    for (var d = 0; d <= 9; d++)
        map[String(d)] = Key.key0 + d;
    return map;
})();
// Non-printable event.key values; each shares its name with its code.
var NAMED_KEYS = new Set(__spreadArray([
    "Enter",
    "Tab",
    "Backspace",
    "Insert",
    "Delete",
    "Escape",
    "ArrowRight",
    "ArrowLeft",
    "ArrowDown",
    "ArrowUp",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    "CapsLock",
    "ScrollLock",
    "NumLock",
    "PrintScreen",
    "Pause",
    "ContextMenu"
], Array.from({ length: 25 }, function (_, i) { return "F".concat(i + 1); }), true));
/**
 * Maps a KeyboardEvent to a Rive key, or null if Rive has no equivalent.
 *
 * Resolves the logical key: what the user's layout labels the key, ignoring
 * Shift, so a listener on "A" fires on AZERTY's A too. `event.key` is preferred;
 * `event.code` is the fallback when `key` isn't a plain unshifted character
 * (shifted symbols, Option/AltGr output, non-Latin letters, dead keys).
 * Digit-row and numpad keys skip the character lookup so AZERTY's digit row
 * still reports digits and numpad digits stay distinct from the digit row.
 */
function keyboardEventToRiveKey(event) {
    var _a, _b;
    var code = event.code, key = event.key;
    if (NAMED_KEYS.has(key)) {
        // NumpadEnter reports key "Enter"; keep it distinct.
        return code === "NumpadEnter" ? Key.kpEnter : (_a = CODE_TO_KEY[key]) !== null && _a !== void 0 ? _a : null;
    }
    if (!code.startsWith("Digit") && !code.startsWith("Numpad") && key) {
        var fromChar = CHAR_TO_KEY[key.toLowerCase()];
        if (fromChar !== undefined)
            return fromChar;
    }
    return (_b = CODE_TO_KEY[code]) !== null && _b !== void 0 ? _b : null;
}
function modifiersFromEvent(event) {
    var modifiers = KeyModifiers.none;
    if (event.shiftKey)
        modifiers |= KeyModifiers.shift;
    if (event.ctrlKey)
        modifiers |= KeyModifiers.ctrl;
    if (event.altKey)
        modifiers |= KeyModifiers.alt;
    if (event.metaKey)
        modifiers |= KeyModifiers.meta;
    return modifiers;
}


/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TextInputProxy: () => (/* binding */ TextInputProxy)
/* harmony export */ });
/* harmony import */ var _canvasOffset__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(12);

// 16px: the smallest font size at which iOS Safari doesn't zoom on focus
var FONT_SIZE_PX = 16;
/** Capture-critical attributes decorate() must not touch. */
var PROTECTED_ATTRS = new Set([
    "type",
    "value",
    "style",
    "tabindex",
    "autocapitalize",
    "autocomplete",
    "autocorrect",
    "spellcheck",
]);
/**
 * Invisible per-instance <input> capturing IME/dead-key/paste text; focusable inside a
 * gesture to raise mobile keyboards. Always empty: C++ owns value and caret. Decorated
 * for AT only while it holds DOM focus.
 */
var TextInputProxy = /** @class */ (function () {
    function TextInputProxy(params) {
        var _this = this;
        // True between compositionstart/compositionend; we never commit mid-composition.
        this.composing = false;
        // Names set by decorate(), removed by resetDecoration().
        this.decoratedKeys = new Set();
        // Last written left/top, to skip no-op style writes.
        this.lastLeft = NaN;
        this.lastTop = NaN;
        /** Re-sync before input: the canvas may have scrolled since the session began. */
        this.reposition = function () { return _this.positionOverCanvas(); };
        this.onCompositionStart = function () {
            _this.composing = true;
        };
        this.onCompositionEnd = function () {
            _this.composing = false;
            // The composed text is now committed in element.value; forward it here. A
            // trailing `input` event (order varies by browser) then sees an empty field.
            _this.commit();
        };
        this.onInput = function () {
            if (_this.composing)
                return;
            _this.commit();
        };
        // An <input type=text> strips line breaks from its value, so forward the clipboard
        // text directly. Core's single-line fields strip them themselves.
        this.onPaste = function (event) {
            var _a;
            var text = (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.getData("text/plain");
            if (!text)
                return;
            event.preventDefault();
            _this.params.textInput(text.replace(/\r\n?/g, "\n"));
        };
        this.onBlur = function (event) {
            _this.params.onBlur(event.relatedTarget);
        };
        this.params = params;
        this.element = this.createElement();
        this.positionOverCanvas();
        // Order vs. the overlay is unspecified; fine, Tab release starts from the canvas.
        this.params.container.appendChild(this.element);
    }
    // Registered first so it runs before the key handler inserts or moves the caret.
    TextInputProxy.prototype.listeners = function () {
        return [
            ["keydown", this.reposition],
            ["beforeinput", this.reposition],
            ["keydown", this.params.onKeyDown],
            ["keyup", this.params.onKeyUp],
            ["input", this.onInput],
            ["compositionstart", this.onCompositionStart],
            ["compositionend", this.onCompositionEnd],
            ["paste", this.onPaste],
            ["copy", this.params.onCopy],
            ["blur", this.onBlur],
        ];
    };
    TextInputProxy.prototype.createElement = function () {
        var el = document.createElement("input");
        el.type = "text";
        // Focusable but never in native tab order (Rive drives traversal synthetically),
        // and invisible without display:none (which would forbid focus).
        el.tabIndex = -1;
        el.setAttribute("aria-hidden", "true");
        // Always empty, so autocapitalize/autocorrect would misfire.
        el.setAttribute("autocapitalize", "off");
        el.setAttribute("autocomplete", "off");
        el.setAttribute("autocorrect", "off");
        el.spellcheck = false;
        // Over the canvas (not display:none) so iOS doesn't scroll-jump on keyboard open.
        // font-size must stay 16px or iOS Safari zooms on focus.
        el.style.cssText =
            "position:absolute;width:1px;height:1px;padding:0;margin:0;border:0;" +
                "outline:none;opacity:0;background:transparent;color:transparent;" +
                "caret-color:transparent;overflow:hidden;resize:none;z-index:0;" +
                // Focused programmatically only; must not swallow clicks
                "pointer-events:none;" +
                "font-size:".concat(FONT_SIZE_PX, "px;line-height:1;");
        for (var _i = 0, _a = this.listeners(); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], listener = _b[1];
            el.addEventListener(type, listener);
        }
        return el;
    };
    TextInputProxy.prototype.positionOverCanvas = function () {
        // Track the canvas (browsers scroll to the caret); clamp on-screen, one caret line box
        // (FONT_SIZE_PX) from the far edges, or the root scrolls to reveal it.
        var _a = (0,_canvasOffset__WEBPACK_IMPORTED_MODULE_0__.canvasOffset)(this.params.canvas), top = _a.top, left = _a.left;
        if (window.innerHeight > 0) {
            var r = this.params.canvas.getBoundingClientRect();
            top += clamp(r.top, 0, window.innerHeight - FONT_SIZE_PX) - r.top;
            left += clamp(r.left, 0, window.innerWidth - FONT_SIZE_PX) - r.left;
        }
        if (left !== this.lastLeft) {
            this.element.style.left = "".concat(left, "px");
            this.lastLeft = left;
        }
        if (top !== this.lastTop) {
            this.element.style.top = "".concat(top, "px");
            this.lastTop = top;
        }
    };
    /**
     * Forward the field's text to Rive and clear it.
     *
     * TODO: iOS won't autorepeat Backspace in an empty field (needs a text mirror).
     * */
    TextInputProxy.prototype.commit = function () {
        var text = this.element.value;
        if (!text)
            return;
        this.element.value = "";
        this.params.textInput(text);
    };
    /** Clear any transient value and decoration. Does not blur the element. */
    TextInputProxy.prototype.endSession = function () {
        this.element.value = "";
        // Browsers fire compositionend on blur, but a stuck flag would drop every
        // keystroke of the next session.
        this.composing = false;
        // Also covers blur-out, which bypasses the overlay.
        this.resetDecoration();
    };
    /** Must be called synchronously inside a gesture on iOS to raise the keyboard. */
    TextInputProxy.prototype.focus = function () {
        // Reposition first: iOS scrolls the focused input into view when the keyboard opens.
        this.positionOverCanvas();
        this.element.focus({ preventScroll: true });
    };
    TextInputProxy.prototype.hasDomFocus = function () {
        return document.activeElement === this.element;
    };
    TextInputProxy.prototype.owns = function (target) {
        return target === this.element;
    };
    /** See EditingHost.decorate. */
    TextInputProxy.prototype.decorate = function (attrs) {
        // aria-hidden outranks every attribute set below, so it must come off before this
        // element can stand in as the accessible element for the focused node.
        this.element.removeAttribute("aria-hidden");
        for (var _i = 0, _a = Object.entries(attrs); _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], value = _b[1];
            // Never override capture attrs.
            if (PROTECTED_ATTRS.has(name_1.toLowerCase()))
                continue;
            if (value === null) {
                this.element.removeAttribute(name_1);
                this.decoratedKeys.delete(name_1);
            }
            else {
                // Skip no-op writes: setting an attribute to the value it already has still
                // emits a mutation, and assistive tech is focused on this element mid-edit.
                if (this.element.getAttribute(name_1) !== value) {
                    this.element.setAttribute(name_1, value);
                }
                this.decoratedKeys.add(name_1);
            }
        }
    };
    /**
     * type=password for obscured fields so AT doesn't echo keys.
     * TODO: source "type" from Core, not semantics.
     */
    TextInputProxy.prototype.setSecure = function (secure) {
        var type = secure ? "password" : "text";
        if (this.element.type !== type)
            this.element.type = type;
    };
    /** Drop all decoration and return to the AT-invisible baseline. */
    TextInputProxy.prototype.resetDecoration = function () {
        var _this = this;
        this.setSecure(false);
        this.decoratedKeys.forEach(function (name) { return _this.element.removeAttribute(name); });
        this.decoratedKeys.clear();
        this.element.setAttribute("aria-hidden", "true");
    };
    TextInputProxy.prototype.cleanup = function () {
        for (var _i = 0, _a = this.listeners(); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], listener = _b[1];
            this.element.removeEventListener(type, listener);
        }
        this.element.remove();
    };
    return TextInputProxy;
}());

function clamp(v, min, max) {
    return Math.min(Math.max(v, min), Math.max(min, max));
}


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GamepadInteractions: () => (/* binding */ GamepadInteractions)
/* harmony export */ });
/* harmony import */ var _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(20);

// Standard mapping: 17 buttons, 4 stick axes, plus triggers mirrored onto axes 4/5.
var STANDARD_BUTTON_COUNT = 17;
var STANDARD_STICK_AXIS_COUNT = 4;
var LEFT_TRIGGER_BUTTON = 6;
var RIGHT_TRIGGER_BUTTON = 7;
// Consecutive rejected batches before giving up on a state machine.
var MAX_SUBMIT_FAILURES = 3;
function zeros(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
        out.push(0);
    }
    return out;
}
function restState(pad) {
    return {
        deviceId: pad.deviceId,
        mapping: pad.mapping,
        buttons: zeros(pad.buttons.length),
        axes: zeros(pad.axes.length),
    };
}
function readNavigatorGamepads() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) {
        return [];
    }
    try {
        return Array.prototype.slice.call(navigator.getGamepads());
    }
    catch (_a) {
        // Permissions-Policy or insecure-origin SecurityError.
        return [];
    }
}
function readButtons(pad, count) {
    var buttons = [];
    for (var i = 0; i < count; i++) {
        buttons.push(pad.buttons[i] ? pad.buttons[i].value : 0);
    }
    return buttons;
}
function toPadState(deviceId, pad) {
    var _a;
    if (pad.mapping !== "standard") {
        // Unknown layout: sent as reported, up to the core's caps.
        return {
            deviceId: deviceId,
            mapping: _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GamepadMappingKind.Unknown,
            buttons: readButtons(pad, Math.min(pad.buttons.length, _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GAMEPAD_MAX_BUTTONS)),
            axes: pad.axes.slice(0, _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GAMEPAD_MAX_AXES),
        };
    }
    var buttons = readButtons(pad, STANDARD_BUTTON_COUNT);
    var axes = [];
    for (var i = 0; i < STANDARD_STICK_AXIS_COUNT; i++) {
        axes.push((_a = pad.axes[i]) !== null && _a !== void 0 ? _a : 0);
    }
    axes.push(buttons[LEFT_TRIGGER_BUTTON], buttons[RIGHT_TRIGGER_BUTTON]);
    return { deviceId: deviceId, mapping: _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GamepadMappingKind.Standard, buttons: buttons, axes: axes };
}
/**
 * Page-wide gamepad reader shared by every Rive instance: one `getGamepads()` per frame,
 * device ids allocated once (monotonic from 1, never reused), and a single window listener.
 */
var GamepadSource = /** @class */ (function () {
    function GamepadSource() {
        var _this = this;
        // One per subscribed instance; the window listener lives while any remain.
        this.connectListeners = new Set();
        this.hasPads = false;
        this.nextDeviceId = 1;
        this.slots = {};
        this.cachedTime = NaN;
        this.cached = [];
        this.onConnected = function () {
            _this.hasPads = true;
            _this.connectListeners.forEach(function (listener) { return listener(); });
        };
    }
    GamepadSource.prototype.subscribe = function (onConnected) {
        this.connectListeners.add(onConnected);
        if (this.connectListeners.size > 1 || typeof window === "undefined") {
            return;
        }
        window.addEventListener("gamepadconnected", this.onConnected);
        // The event doesn't re-fire for pads exposed before we started listening.
        this.hasPads = readNavigatorGamepads().some(function (pad) { return !!pad; });
    };
    GamepadSource.prototype.unsubscribe = function (onConnected) {
        this.connectListeners.delete(onConnected);
        if (this.connectListeners.size > 0 || typeof window === "undefined") {
            return;
        }
        window.removeEventListener("gamepadconnected", this.onConnected);
        this.hasPads = false;
        this.cachedTime = NaN;
        this.cached = [];
    };
    Object.defineProperty(GamepadSource.prototype, "hasConnectedPads", {
        /** A pad was connected at the last read, or has connected since. */
        get: function () {
            return this.hasPads;
        },
        enumerable: false,
        configurable: true
    });
    /** Current pads; cached per rAF timestamp so instances share one read. */
    GamepadSource.prototype.read = function (time) {
        if (!this.hasPads) {
            return [];
        }
        if (time === this.cachedTime) {
            return this.cached;
        }
        var pads = [];
        // Rebuilt each read so emptied slots drop out.
        var slots = {};
        var gamepads = readNavigatorGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            var pad = gamepads[i];
            if (!pad || !pad.connected) {
                continue;
            }
            var prev = this.slots[pad.index];
            var slot = prev && prev.id === pad.id
                ? prev
                : { deviceId: this.nextDeviceId++, id: pad.id };
            slots[pad.index] = slot;
            pads.push(toPadState(slot.deviceId, pad));
        }
        this.slots = slots;
        this.hasPads = pads.length > 0;
        this.cachedTime = time;
        this.cached = pads;
        return pads;
    };
    return GamepadSource;
}());
var gamepadSource = new GamepadSource();
/**
 * Per-Rive-instance gamepad bridge driving a single state machine. Tracks what that state
 * machine has been sent and submits only the difference, so after a pause it catches up
 * without duplicate connected events.
 */
var GamepadInteractions = /** @class */ (function () {
    function GamepadInteractions(params) {
        this.params = params;
        this.encoder = new _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GamepadBatchEncoder();
        // deviceId -> values last sent to `stateMachine`.
        this.lastSentPads = new Map();
        this.submitFailures = 0;
        gamepadSource.subscribe(params.onPadConnected);
    }
    Object.defineProperty(GamepadInteractions.prototype, "isPolling", {
        /** Whether pads need reading each frame: one is connected, or one still has to be disconnected. */
        get: function () {
            return (this.submitFailures < MAX_SUBMIT_FAILURES &&
                (gamepadSource.hasConnectedPads || this.lastSentPads.size > 0));
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Poll, diff and submit one batch. Call once per frame before advancing.
     * @returns true when a batch was sent to the state machine
     */
    GamepadInteractions.prototype.handleGamepadInputs = function (time, stateMachine) {
        if (!stateMachine) {
            return false;
        }
        if (stateMachine !== this.stateMachine) {
            // A new state machine knows no devices yet; resend connected records.
            this.stateMachine = stateMachine;
            this.lastSentPads.clear();
            this.submitFailures = 0;
        }
        if (!this.isPolling) {
            return false;
        }
        var pads = gamepadSource.read(time);
        if (this.params.requireFocus && !this.params.isFocusWithin()) {
            // Keep devices connected but release everything they hold.
            pads = pads.map(restState);
        }
        this.encoder.begin();
        this.encodeDiff(pads);
        if (this.encoder.isEmpty) {
            return false;
        }
        if (stateMachine.submitGamepadsFromBuffer(this.encoder.end())) {
            this.submitFailures = 0;
            return true;
        }
        // The core stops at the first bad record, so resend connected records next
        // frame rather than updates for devices it may never have seen.
        this.lastSentPads.clear();
        if (++this.submitFailures >= MAX_SUBMIT_FAILURES) {
            console.error("[Rive] Gamepad input was rejected by the state machine " +
                "".concat(MAX_SUBMIT_FAILURES, " times in a row; gamepad input is disabled for it."));
        }
        return false;
    };
    GamepadInteractions.prototype.dispose = function () {
        this.stateMachine = undefined;
        this.lastSentPads.clear();
        gamepadSource.unsubscribe(this.params.onPadConnected);
    };
    /** Writes records that bring `lastSentPads` up to `pads`, updating it as it goes. */
    GamepadInteractions.prototype.encodeDiff = function (pads) {
        var _this = this;
        var present = {};
        for (var i = 0; i < pads.length; i++) {
            var pad = pads[i];
            present[pad.deviceId] = true;
            var prev = this.lastSentPads.get(pad.deviceId);
            if (!prev) {
                // Connect at rest so inputs already held fire as updates.
                prev = restState(pad);
                this.encoder.connected(pad.deviceId, pad.mapping, prev.buttons, prev.axes);
                this.lastSentPads.set(pad.deviceId, prev);
            }
            this.encodeChanges(pad.deviceId, _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GamepadChangeKind.Button, prev.buttons, pad.buttons);
            this.encodeChanges(pad.deviceId, _gamepadBatchEncoder__WEBPACK_IMPORTED_MODULE_0__.GamepadChangeKind.Axis, prev.axes, pad.axes);
        }
        this.lastSentPads.forEach(function (_, deviceId) {
            if (!present[deviceId]) {
                _this.encoder.disconnected(deviceId);
                _this.lastSentPads.delete(deviceId);
            }
        });
    };
    GamepadInteractions.prototype.encodeChanges = function (deviceId, kind, prev, next) {
        for (var i = 0; i < next.length; i++) {
            var value = next[i];
            if (value !== prev[i]) {
                this.encoder.update(deviceId, kind, i, value);
                prev[i] = value;
            }
        }
    };
    return GamepadInteractions;
}());



/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GAMEPAD_BATCH_VERSION: () => (/* binding */ GAMEPAD_BATCH_VERSION),
/* harmony export */   GAMEPAD_MAX_AXES: () => (/* binding */ GAMEPAD_MAX_AXES),
/* harmony export */   GAMEPAD_MAX_BUTTONS: () => (/* binding */ GAMEPAD_MAX_BUTTONS),
/* harmony export */   GamepadBatchEncoder: () => (/* binding */ GamepadBatchEncoder),
/* harmony export */   GamepadChangeKind: () => (/* binding */ GamepadChangeKind),
/* harmony export */   GamepadMappingKind: () => (/* binding */ GamepadMappingKind),
/* harmony export */   GamepadRecordType: () => (/* binding */ GamepadRecordType)
/* harmony export */ });
/** Must match `rive::kGamepadBatchWireVersion` (runtime/include/rive/input/gamepad_batch.hpp). */
var GAMEPAD_BATCH_VERSION = 2;
var GAMEPAD_MAX_BUTTONS = 32;
var GAMEPAD_MAX_AXES = 16;
// Byte sizes of the wire fields/records.
var VERSION_SIZE = 4; // u32
var VALUE_SIZE = 4; // f32 button/axis value
// type(1) + deviceId(4) + mapping(1) + nButtons(1) + nAxes(1) + padding(1); values follow
var CONNECTED_HEADER_SIZE = 9;
// type(1) + deviceId(4) + nChanges(1) + kind(1) + index(1) + value(4)
// Always 12B because we send one change per event, but we could revisit to send larger updates.
var UPDATE_RECORD_SIZE = 12;
// type(1) + deviceId(4)
var DISCONNECTED_RECORD_SIZE = 5;
/** C++ `rive::GamepadRecordType`. */
var GamepadRecordType;
(function (GamepadRecordType) {
    GamepadRecordType[GamepadRecordType["Connected"] = 0] = "Connected";
    GamepadRecordType[GamepadRecordType["Update"] = 1] = "Update";
    GamepadRecordType[GamepadRecordType["Disconnected"] = 2] = "Disconnected";
})(GamepadRecordType || (GamepadRecordType = {}));
/** C++ `rive::GamepadInputChangeKind`. */
var GamepadChangeKind;
(function (GamepadChangeKind) {
    GamepadChangeKind[GamepadChangeKind["Button"] = 0] = "Button";
    GamepadChangeKind[GamepadChangeKind["Axis"] = 1] = "Axis";
})(GamepadChangeKind || (GamepadChangeKind = {}));
/** C++ `rive::GamepadMappingKind`. */
var GamepadMappingKind;
(function (GamepadMappingKind) {
    GamepadMappingKind[GamepadMappingKind["Standard"] = 0] = "Standard";
    GamepadMappingKind[GamepadMappingKind["Unknown"] = 1] = "Unknown";
})(GamepadMappingKind || (GamepadMappingKind = {}));
/**
 * Builds buffer to send to the state machine for gamepad input connection/updates/disconnect.
 *
 * Each `update` record carries a single change: the core
 * applies and dispatches records in order, so N single-change records in one batch behave like
 * N separate submits.
 *
 * `end()` returns a view into a reused scratch buffer, valid until the next `begin()`.
 */
var GamepadBatchEncoder = /** @class */ (function () {
    function GamepadBatchEncoder(initialCapacity) {
        if (initialCapacity === void 0) { initialCapacity = 256; }
        this.offset = 0;
        this.buffer = new ArrayBuffer(initialCapacity);
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
    }
    GamepadBatchEncoder.prototype.begin = function () {
        this.offset = 0;
        this.ensure(VERSION_SIZE);
        this.writeU32(GAMEPAD_BATCH_VERSION);
    };
    Object.defineProperty(GamepadBatchEncoder.prototype, "isEmpty", {
        /** True when no records were written since `begin()`. */
        get: function () {
            return this.offset <= VERSION_SIZE;
        },
        enumerable: false,
        configurable: true
    });
    /** Set up buffer size/initialized values for a connected device */
    GamepadBatchEncoder.prototype.connected = function (deviceId, mapping, buttonValues, axes) {
        var nButtons = Math.min(buttonValues.length, GAMEPAD_MAX_BUTTONS);
        var nAxes = Math.min(axes.length, GAMEPAD_MAX_AXES);
        this.ensure(CONNECTED_HEADER_SIZE + (nButtons + nAxes) * VALUE_SIZE);
        this.writeU8(GamepadRecordType.Connected);
        this.writeI32(deviceId);
        this.writeU8(mapping);
        this.writeU8(nButtons);
        this.writeU8(nAxes);
        this.writeU8(0); // padding
        for (var i = 0; i < nButtons; i++) {
            this.writeF32(buttonValues[i]);
        }
        for (var i = 0; i < nAxes; i++) {
            this.writeF32(axes[i]);
        }
    };
    /**  */
    GamepadBatchEncoder.prototype.update = function (deviceId, kind, index, value) {
        this.ensure(UPDATE_RECORD_SIZE);
        this.writeU8(GamepadRecordType.Update);
        this.writeI32(deviceId);
        this.writeU8(1); // one change per record
        this.writeU8(kind);
        this.writeU8(index);
        this.writeF32(value);
    };
    GamepadBatchEncoder.prototype.disconnected = function (deviceId) {
        this.ensure(DISCONNECTED_RECORD_SIZE);
        this.writeU8(GamepadRecordType.Disconnected);
        this.writeI32(deviceId);
    };
    GamepadBatchEncoder.prototype.end = function () {
        return this.bytes.subarray(0, this.offset);
    };
    /** ---------------- Helper/private methods ---------------- */
    // The below write* methods write a value to the buffer and increment the offset position in our central buffer
    GamepadBatchEncoder.prototype.writeU8 = function (value) {
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    };
    GamepadBatchEncoder.prototype.writeU32 = function (value) {
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    };
    GamepadBatchEncoder.prototype.writeI32 = function (value) {
        this.view.setInt32(this.offset, value, true);
        this.offset += 4;
    };
    GamepadBatchEncoder.prototype.writeF32 = function (value) {
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
    };
    // Increase the byte buffer size if necessary
    GamepadBatchEncoder.prototype.ensure = function (additional) {
        var required = this.offset + additional;
        if (required <= this.buffer.byteLength) {
            return;
        }
        var capacity = this.buffer.byteLength * 2;
        while (capacity < required) {
            capacity *= 2;
        }
        var grown = new ArrayBuffer(capacity);
        var grownBytes = new Uint8Array(grown);
        grownBytes.set(this.bytes.subarray(0, this.offset));
        this.buffer = grown;
        this.view = new DataView(grown);
        this.bytes = grownBytes;
    };
    return GamepadBatchEncoder;
}());



/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BLANK_URL: () => (/* binding */ BLANK_URL),
/* harmony export */   sanitizeUrl: () => (/* binding */ sanitizeUrl)
/* harmony export */ });
// Reference: https://github.com/braintree/sanitize-url/tree/main
var invalidProtocolRegex = /^([^\w]*)(javascript|data|vbscript)/im;
var htmlEntitiesRegex = /&#(\w+)(^\w|;)?/g;
var htmlCtrlEntityRegex = /&(newline|tab);/gi;
var ctrlCharactersRegex = /[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;
var urlSchemeRegex = /^.+(:|&colon;)/gim;
var relativeFirstCharacters = [".", "/"];
var BLANK_URL = "about:blank";
function isRelativeUrlWithoutProtocol(url) {
    return relativeFirstCharacters.indexOf(url[0]) > -1;
}
// adapted from https://stackoverflow.com/a/29824550/2601552
function decodeHtmlCharacters(str) {
    var removedNullByte = str.replace(ctrlCharactersRegex, "");
    return removedNullByte.replace(htmlEntitiesRegex, function (match, dec) {
        return String.fromCharCode(dec);
    });
}
function sanitizeUrl(url) {
    if (!url) {
        return BLANK_URL;
    }
    var sanitizedUrl = decodeHtmlCharacters(url)
        .replace(htmlCtrlEntityRegex, "")
        .replace(ctrlCharactersRegex, "")
        .trim();
    if (!sanitizedUrl) {
        return BLANK_URL;
    }
    if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
        return sanitizedUrl;
    }
    var urlSchemeParseResults = sanitizedUrl.match(urlSchemeRegex);
    if (!urlSchemeParseResults) {
        return sanitizedUrl;
    }
    var urlScheme = urlSchemeParseResults[0];
    if (invalidProtocolRegex.test(urlScheme)) {
        return BLANK_URL;
    }
    return sanitizedUrl;
}


/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AudioAssetWrapper: () => (/* binding */ AudioAssetWrapper),
/* harmony export */   AudioWrapper: () => (/* binding */ AudioWrapper),
/* harmony export */   CustomFileAssetLoaderWrapper: () => (/* binding */ CustomFileAssetLoaderWrapper),
/* harmony export */   FileAssetWrapper: () => (/* binding */ FileAssetWrapper),
/* harmony export */   FileFinalizer: () => (/* binding */ FileFinalizer),
/* harmony export */   FontAssetWrapper: () => (/* binding */ FontAssetWrapper),
/* harmony export */   FontWrapper: () => (/* binding */ FontWrapper),
/* harmony export */   ImageAssetWrapper: () => (/* binding */ ImageAssetWrapper),
/* harmony export */   ImageWrapper: () => (/* binding */ ImageWrapper),
/* harmony export */   createFinalization: () => (/* binding */ createFinalization),
/* harmony export */   finalizationRegistry: () => (/* binding */ finalizationRegistry)
/* harmony export */ });
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var FileFinalizer = /** @class */ (function () {
    function FileFinalizer(file, session) {
        if (session === void 0) { session = null; }
        this.selfUnref = false;
        this._file = file;
        this._session = session;
    }
    FileFinalizer.prototype.unref = function () {
        if (this._file) {
            this._file.unref();
        }
        // After the file, never before: the file's resources belong to the session.
        if (this._session) {
            this._session.delete();
            this._session = null;
        }
    };
    // Disarms the GC path for a file cleanup() already released.
    FileFinalizer.prototype.release = function () {
        this._file = null;
        this._session = null;
    };
    return FileFinalizer;
}());
var ObjectFinalizer = /** @class */ (function () {
    function ObjectFinalizer(finalizableObject) {
        this._finalizableObject = finalizableObject;
    }
    ObjectFinalizer.prototype.unref = function () {
        this._finalizableObject.unref();
    };
    return ObjectFinalizer;
}());
var AssetWrapper = /** @class */ (function () {
    function AssetWrapper() {
        this.selfUnref = false;
    }
    AssetWrapper.prototype.unref = function () { };
    return AssetWrapper;
}());
var ImageWrapper = /** @class */ (function (_super) {
    __extends(ImageWrapper, _super);
    function ImageWrapper(image) {
        var _this = _super.call(this) || this;
        _this._nativeImage = image;
        return _this;
    }
    Object.defineProperty(ImageWrapper.prototype, "nativeImage", {
        get: function () {
            return this._nativeImage;
        },
        enumerable: false,
        configurable: true
    });
    ImageWrapper.prototype.unref = function () {
        if (this.selfUnref) {
            this._nativeImage.unref();
        }
    };
    return ImageWrapper;
}(AssetWrapper));
var AudioWrapper = /** @class */ (function (_super) {
    __extends(AudioWrapper, _super);
    function AudioWrapper(audio) {
        var _this = _super.call(this) || this;
        _this._nativeAudio = audio;
        return _this;
    }
    Object.defineProperty(AudioWrapper.prototype, "nativeAudio", {
        get: function () {
            return this._nativeAudio;
        },
        enumerable: false,
        configurable: true
    });
    AudioWrapper.prototype.unref = function () {
        if (this.selfUnref) {
            this._nativeAudio.unref();
        }
    };
    return AudioWrapper;
}(AssetWrapper));
var FontWrapper = /** @class */ (function (_super) {
    __extends(FontWrapper, _super);
    function FontWrapper(font) {
        var _this = _super.call(this) || this;
        _this._nativeFont = font;
        return _this;
    }
    Object.defineProperty(FontWrapper.prototype, "nativeFont", {
        get: function () {
            return this._nativeFont;
        },
        enumerable: false,
        configurable: true
    });
    FontWrapper.prototype.unref = function () {
        if (this.selfUnref) {
            this._nativeFont.unref();
        }
    };
    return FontWrapper;
}(AssetWrapper));
var CustomFileAssetLoaderWrapper = /** @class */ (function () {
    function CustomFileAssetLoaderWrapper(runtime, loaderCallback, session) {
        if (session === void 0) { session = null; }
        this._assetLoaderCallback = loaderCallback;
        this._session = session;
        this.assetLoader = new runtime.CustomFileAssetLoader({
            loadContents: this.loadContents.bind(this),
        });
    }
    CustomFileAssetLoaderWrapper.prototype.loadContents = function (asset, bytes) {
        var assetWrapper;
        if (asset.isImage) {
            assetWrapper = new ImageAssetWrapper(asset, this._session);
        }
        else if (asset.isAudio) {
            assetWrapper = new AudioAssetWrapper(asset, this._session);
        }
        else if (asset.isFont) {
            assetWrapper = new FontAssetWrapper(asset, this._session);
        }
        else {
            return false;
        }
        return this._assetLoaderCallback(assetWrapper, bytes);
    };
    return CustomFileAssetLoaderWrapper;
}());
/**
 * Rive class representing a FileAsset with relevant metadata fields to describe
 * an asset associated wtih the Rive File
 */
var FileAssetWrapper = /** @class */ (function () {
    function FileAssetWrapper(nativeAsset, session) {
        if (session === void 0) { session = null; }
        this._nativeFileAsset = nativeAsset;
        this._session = session;
    }
    FileAssetWrapper.prototype.decode = function (bytes) {
        // The session travels with the asset so a deferred file's assets are
        // session-typed without the caller needing to know the file's rendering mode.
        this._nativeFileAsset.decode(bytes, this._session);
    };
    Object.defineProperty(FileAssetWrapper.prototype, "name", {
        get: function () {
            return this._nativeFileAsset.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "fileExtension", {
        get: function () {
            return this._nativeFileAsset.fileExtension;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "uniqueFilename", {
        get: function () {
            return this._nativeFileAsset.uniqueFilename;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "isAudio", {
        get: function () {
            return this._nativeFileAsset.isAudio;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "isImage", {
        get: function () {
            return this._nativeFileAsset.isImage;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "isFont", {
        get: function () {
            return this._nativeFileAsset.isFont;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "cdnUuid", {
        get: function () {
            return this._nativeFileAsset.cdnUuid;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileAssetWrapper.prototype, "nativeFileAsset", {
        get: function () {
            return this._nativeFileAsset;
        },
        enumerable: false,
        configurable: true
    });
    return FileAssetWrapper;
}());
/**
 * Rive class extending the FileAsset that exposes a `setRenderImage()` API with a
 * decoded Image (via the `decodeImage()` API) to set a new Image on the Rive FileAsset
 */
var ImageAssetWrapper = /** @class */ (function (_super) {
    __extends(ImageAssetWrapper, _super);
    function ImageAssetWrapper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ImageAssetWrapper.prototype.setRenderImage = function (image) {
        this._nativeFileAsset.setRenderImage(image.nativeImage);
    };
    return ImageAssetWrapper;
}(FileAssetWrapper));
/**
 * Rive class extending the FileAsset that exposes a `setAudioSource()` API with a
 * decoded Audio (via the `decodeAudio()` API) to set a new Audio on the Rive FileAsset
 */
var AudioAssetWrapper = /** @class */ (function (_super) {
    __extends(AudioAssetWrapper, _super);
    function AudioAssetWrapper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AudioAssetWrapper.prototype.setAudioSource = function (audio) {
        this._nativeFileAsset.setAudioSource(audio.nativeAudio);
    };
    return AudioAssetWrapper;
}(FileAssetWrapper));
/**
 * Rive class extending the FileAsset that exposes a `setFont()` API with a
 * decoded Font (via the `decodeFont()` API) to set a new Font on the Rive FileAsset
 */
var FontAssetWrapper = /** @class */ (function (_super) {
    __extends(FontAssetWrapper, _super);
    function FontAssetWrapper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FontAssetWrapper.prototype.setFont = function (font) {
        this._nativeFileAsset.setFont(font.nativeFont);
    };
    return FontAssetWrapper;
}(FileAssetWrapper));
var FakeFinalizationRegistry = /** @class */ (function () {
    function FakeFinalizationRegistry(_) {
    }
    FakeFinalizationRegistry.prototype.register = function (object) {
        object.selfUnref = true;
    };
    FakeFinalizationRegistry.prototype.unregister = function (_) { };
    return FakeFinalizationRegistry;
}());
var MyFinalizationRegistry = typeof FinalizationRegistry !== "undefined"
    ? FinalizationRegistry
    : FakeFinalizationRegistry;
var finalizationRegistry = new MyFinalizationRegistry(function (ob) {
    ob === null || ob === void 0 ? void 0 : ob.unref();
});
var createFinalization = function (target, finalizable) {
    var finalizer = new ObjectFinalizer(finalizable);
    finalizationRegistry.register(target, finalizer);
};



/***/ }),
/* 23 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RiveFont: () => (/* binding */ RiveFont)
/* harmony export */ });
/* harmony import */ var _runtimeLoader__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);

// Class to manage fallback fonts for Rive.
var RiveFont = /** @class */ (function () {
    // Class is never instantiated
    function RiveFont() {
    }
    /**
     * Set a callback to dynamically set a list of fallback fonts based on the missing glyph and/or style of the default font.
     * Set null to clear the callback.
     * @param fontCallback Callback to set a list of fallback fonts.
     */
    RiveFont.setFallbackFontCallback = function (fontCallback) {
        RiveFont._fallbackFontCallback = fontCallback !== null && fontCallback !== void 0 ? fontCallback : null;
        RiveFont._wireFallbackProc();
    };
    /**
     * Set the preferred languages (BCP 47 tags, most preferred first) that text
     * without a `language` of its own shapes and falls back with, like
     * `navigator.languages` is for a page. Pass nothing to follow
     * `navigator.languages`, which is also what happens until this is called,
     * including when the browser's languages change.
     * @param languages The languages to use, or nothing for the browser's.
     */
    RiveFont.setSystemLanguages = function (languages) {
        _runtimeLoader__WEBPACK_IMPORTED_MODULE_0__.RuntimeLoader.setSystemLanguages(languages !== null && languages !== void 0 ? languages : null);
    };
    // Get the pointer value to the Embind Font object from FontWrapper
    RiveFont._fontToPtr = function (fontWrapper) {
        var _a;
        if (fontWrapper == null)
            return null;
        var embindFont = fontWrapper.nativeFont;
        var ptr = (_a = embindFont === null || embindFont === void 0 ? void 0 : embindFont.ptr) === null || _a === void 0 ? void 0 : _a.call(embindFont);
        return ptr !== null && ptr !== void 0 ? ptr : null;
    };
    RiveFont._getFallbackPtr = function (fonts, index) {
        if (index < 0 || index >= fonts.length)
            return null;
        return RiveFont._fontToPtr(fonts[index]);
    };
    // Create the callback Rive expects to use for fallback fonts (regardless if set via a user-supplied static list, or callback)
    // 1. Ensure WASM is ready
    // 2. Bias for checking user callback over static list of fonts and pass it down to Rive to store as reference
    //    - When calling the user callback, check if we have any fonts left to check, and if not, return null to indicate there are no more fallbacks to try.
    //    - If the user callback returns an array of fonts, pass the pointer value to Rive of the font to try
    // 3. If no callback is provided, or the callback returns null, try the static list of fonts if they set any
    // 4. If no fallback method is set, return null.
    RiveFont._wireFallbackProc = function () {
        _runtimeLoader__WEBPACK_IMPORTED_MODULE_0__.RuntimeLoader.getInstance(function (rive) {
            var cb = RiveFont._fallbackFontCallback;
            if (cb) {
                rive.setFallbackFontCallback((function (missingGlyph, fallbackFontIndex, weight, languages) {
                    var fontsReturned = cb(missingGlyph, weight, languages !== null && languages !== void 0 ? languages : []);
                    if (fontsReturned) {
                        if (Array.isArray(fontsReturned)) {
                            return RiveFont._getFallbackPtr(fontsReturned, fallbackFontIndex);
                        }
                        // If the user callback only returns a single font, provide it to Rive the first time, otherwise if Rive
                        // calls back a second time, return null to indicate there are no more fallbacks to try.
                        return fallbackFontIndex === 0 ? RiveFont._fontToPtr(fontsReturned) : null;
                    }
                    return null;
                }));
            }
            else {
                rive.setFallbackFontCallback(null);
            }
        });
    };
    RiveFont._fallbackFontCallback = null;
    return RiveFont;
}());



/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ReplayPacer: () => (/* binding */ ReplayPacer)
/* harmony export */ });
var kRefreshSamples = 15;
// The frames the worker's replay time averages over, plus the three still in
// flight when the cadence changes.
var kSettleFrames = 12;
var kProbeAfterMs = 1000;
var kMaxProbeAfterMs = 16000;
// A worker only slightly slower than its cadence fills its queue now and then,
// a worker that keeps up almost never.
var kBackupWindow = 60;
var kSaturatedBackups = 3;
var median = function (values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[sorted.length >> 1];
};
/**
 * Paces recording to a replay worker slower than the display. Recording as
 * soon as its queue frees sends frames in bursts, so instead they go out every
 * N refreshes, with N following the worker's recent replay time.
 */
var ReplayPacer = /** @class */ (function () {
    function ReplayPacer() {
        this.lastTime = 0;
        this.lastRecord = 0;
        this.intervals = [];
        this.divisor = 1;
        // Frames recorded since the divisor changed, which the replay time still
        // averages in.
        this.settle = 0;
        this.nextProbe = 0;
        this.probing = false;
        // Failed probes back off, since each one costs a few uneven frames.
        this.probeAfter = kProbeAfterMs;
        // Whether the worker's queue filled since the last decision.
        this.backedUp = false;
        this.recentBackups = [];
    }
    /**
     * Called on every animation frame. Returns whether this one should record,
     * given the worker's replay time and whether its queue has room.
     */
    ReplayPacer.prototype.shouldRecord = function (time, replayMs, accepts) {
        if (this.lastTime && time > this.lastTime) {
            this.intervals.push(time - this.lastTime);
            if (this.intervals.length > kRefreshSamples) {
                this.intervals.shift();
            }
        }
        this.lastTime = time;
        if (!accepts) {
            // A canvas the worker has yet to take refuses frames too.
            if (replayMs > 0) {
                this.backedUp = true;
            }
            return false;
        }
        if (replayMs > 0 && this.intervals.length > 0) {
            var refresh = median(this.intervals);
            if (this.settle === 0) {
                this.adapt(time, replayMs / refresh);
            }
            if (this.divisor > 1 &&
                time - this.lastRecord < (this.divisor - 0.5) * refresh) {
                return false;
            }
        }
        this.lastRecord = time;
        this.settle = Math.max(0, this.settle - 1);
        return true;
    };
    ReplayPacer.prototype.adapt = function (time, ratio) {
        var divisor = this.divisor;
        var backedUp = this.backedUp;
        this.backedUp = false;
        this.recentBackups.push(backedUp);
        if (this.recentBackups.length > kBackupWindow) {
            this.recentBackups.shift();
        }
        var saturated = this.recentBackups.filter(Boolean).length >= kSaturatedBackups;
        var lagging = ratio > divisor * 1.1;
        // A worker that keeps up never fills its queue, however long each frame
        // takes to finish, so only a lag with a full queue slows the cadence. A
        // probe fails on either, since it settled at the new cadence.
        if (this.probing
            ? lagging || backedUp
            : (lagging && backedUp) || (ratio > divisor && saturated)) {
            this.probeAfter = this.probing
                ? Math.min(this.probeAfter * 2, kMaxProbeAfterMs)
                : kProbeAfterMs;
            // At most doubling, since settling at the cadence one bad replay time
            // asks for can hold recording back for seconds.
            this.setDivisor(time, Math.min(Math.max(divisor + 1, Math.ceil(ratio)), divisor * 2));
        }
        else if (ratio < (divisor - 1) * 0.9) {
            // Paced frames no longer overlap, so their replay time is a ceiling
            // and a faster cadence under it is safe.
            this.probeAfter = kProbeAfterMs;
            this.setDivisor(time, Math.max(1, Math.ceil(ratio / 0.9)));
        }
        else if (this.probing) {
            // A worker only slightly too slow takes a while to fill its queue.
            if (this.recentBackups.length >= kBackupWindow) {
                this.probing = false;
                this.probeAfter = kProbeAfterMs;
            }
        }
        else if (divisor > 1 && time >= this.nextProbe) {
            // Frames that overlap on the GPU can keep up with a cadence shorter
            // than one frame's replay, which only trying it shows.
            this.setDivisor(time, divisor - 1);
            this.probing = true;
        }
    };
    ReplayPacer.prototype.setDivisor = function (time, divisor) {
        this.divisor = divisor;
        this.settle = kSettleFrames;
        this.probing = false;
        this.backedUp = false;
        this.recentBackups = [];
        this.nextProbe = time + this.probeAfter;
    };
    return ReplayPacer;
}());



/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Alignment: () => (/* binding */ Alignment),
/* harmony export */   DataEnum: () => (/* binding */ DataEnum),
/* harmony export */   DataType: () => (/* binding */ DataType),
/* harmony export */   DeprecationKeys: () => (/* binding */ DeprecationKeys),
/* harmony export */   DrawOptimizationOptions: () => (/* binding */ DrawOptimizationOptions),
/* harmony export */   EventType: () => (/* binding */ EventType),
/* harmony export */   Fit: () => (/* binding */ Fit),
/* harmony export */   Layout: () => (/* binding */ Layout),
/* harmony export */   LoopType: () => (/* binding */ LoopType),
/* harmony export */   Rive: () => (/* binding */ Rive),
/* harmony export */   RiveEventType: () => (/* binding */ RiveEventType),
/* harmony export */   RiveFile: () => (/* binding */ RiveFile),
/* harmony export */   RiveFont: () => (/* reexport safe */ _utils__WEBPACK_IMPORTED_MODULE_3__.RiveFont),
/* harmony export */   RuntimeLoader: () => (/* reexport safe */ _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader),
/* harmony export */   SemanticMode: () => (/* reexport safe */ _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode),
/* harmony export */   StateMachineInput: () => (/* binding */ StateMachineInput),
/* harmony export */   StateMachineInputType: () => (/* binding */ StateMachineInputType),
/* harmony export */   Testing: () => (/* binding */ Testing),
/* harmony export */   ViewModel: () => (/* binding */ ViewModel),
/* harmony export */   ViewModelInstance: () => (/* binding */ ViewModelInstance),
/* harmony export */   ViewModelInstanceArtboard: () => (/* binding */ ViewModelInstanceArtboard),
/* harmony export */   ViewModelInstanceAssetFont: () => (/* binding */ ViewModelInstanceAssetFont),
/* harmony export */   ViewModelInstanceAssetImage: () => (/* binding */ ViewModelInstanceAssetImage),
/* harmony export */   ViewModelInstanceBoolean: () => (/* binding */ ViewModelInstanceBoolean),
/* harmony export */   ViewModelInstanceColor: () => (/* binding */ ViewModelInstanceColor),
/* harmony export */   ViewModelInstanceEnum: () => (/* binding */ ViewModelInstanceEnum),
/* harmony export */   ViewModelInstanceList: () => (/* binding */ ViewModelInstanceList),
/* harmony export */   ViewModelInstanceNumber: () => (/* binding */ ViewModelInstanceNumber),
/* harmony export */   ViewModelInstanceString: () => (/* binding */ ViewModelInstanceString),
/* harmony export */   ViewModelInstanceTrigger: () => (/* binding */ ViewModelInstanceTrigger),
/* harmony export */   ViewModelInstanceValue: () => (/* binding */ ViewModelInstanceValue),
/* harmony export */   decodeAudio: () => (/* binding */ decodeAudio),
/* harmony export */   decodeFont: () => (/* binding */ decodeFont),
/* harmony export */   decodeImage: () => (/* binding */ decodeImage)
/* harmony export */ });
/* harmony import */ var _animation__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* harmony import */ var _semantics__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(13);
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};




var RiveError = /** @class */ (function (_super) {
    __extends(RiveError, _super);
    function RiveError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.isHandledError = true;
        return _this;
    }
    return RiveError;
}(Error));


// #regions helpers
var resolveErrorMessage = function (error) {
    return error && error.isHandledError
        ? error.message
        : "Problem loading file; may be corrupt!";
};
// #region layout
// Fit options for the canvas
var Fit;
(function (Fit) {
    Fit["Cover"] = "cover";
    Fit["Contain"] = "contain";
    Fit["Fill"] = "fill";
    Fit["FitWidth"] = "fitWidth";
    Fit["FitHeight"] = "fitHeight";
    Fit["None"] = "none";
    Fit["ScaleDown"] = "scaleDown";
    Fit["Layout"] = "layout";
})(Fit || (Fit = {}));
// Alignment options for the canvas
var Alignment;
(function (Alignment) {
    Alignment["Center"] = "center";
    Alignment["TopLeft"] = "topLeft";
    Alignment["TopCenter"] = "topCenter";
    Alignment["TopRight"] = "topRight";
    Alignment["CenterLeft"] = "centerLeft";
    Alignment["CenterRight"] = "centerRight";
    Alignment["BottomLeft"] = "bottomLeft";
    Alignment["BottomCenter"] = "bottomCenter";
    Alignment["BottomRight"] = "bottomRight";
})(Alignment || (Alignment = {}));
// Drawing optimization options
var DrawOptimizationOptions;
(function (DrawOptimizationOptions) {
    DrawOptimizationOptions["AlwaysDraw"] = "alwaysDraw";
    DrawOptimizationOptions["DrawOnChanged"] = "drawOnChanged";
})(DrawOptimizationOptions || (DrawOptimizationOptions = {}));
// Alignment options for Rive animations in a HTML canvas
var Layout = /** @class */ (function () {
    function Layout(params) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.fit = (_a = params === null || params === void 0 ? void 0 : params.fit) !== null && _a !== void 0 ? _a : Fit.Contain;
        this.alignment = (_b = params === null || params === void 0 ? void 0 : params.alignment) !== null && _b !== void 0 ? _b : Alignment.Center;
        this.layoutScaleFactor = (_c = params === null || params === void 0 ? void 0 : params.layoutScaleFactor) !== null && _c !== void 0 ? _c : 1;
        this.minX = (_d = params === null || params === void 0 ? void 0 : params.minX) !== null && _d !== void 0 ? _d : 0;
        this.minY = (_e = params === null || params === void 0 ? void 0 : params.minY) !== null && _e !== void 0 ? _e : 0;
        this.maxX = (_f = params === null || params === void 0 ? void 0 : params.maxX) !== null && _f !== void 0 ? _f : 0;
        this.maxY = (_g = params === null || params === void 0 ? void 0 : params.maxY) !== null && _g !== void 0 ? _g : 0;
    }
    // Alternative constructor to build a Layout from an interface/object
    Layout.new = function (_a) {
        var fit = _a.fit, alignment = _a.alignment, minX = _a.minX, minY = _a.minY, maxX = _a.maxX, maxY = _a.maxY;
        warnOnce(DeprecationKeys.legacyConstructors, "This function is deprecated: please use `new Layout({})` instead");
        return new Layout({ fit: fit, alignment: alignment, minX: minX, minY: minY, maxX: maxX, maxY: maxY });
    };
    /**
     * Makes a copy of the layout, replacing any specified parameters
     */
    Layout.prototype.copyWith = function (_a) {
        var fit = _a.fit, alignment = _a.alignment, layoutScaleFactor = _a.layoutScaleFactor, minX = _a.minX, minY = _a.minY, maxX = _a.maxX, maxY = _a.maxY;
        return new Layout({
            fit: fit !== null && fit !== void 0 ? fit : this.fit,
            alignment: alignment !== null && alignment !== void 0 ? alignment : this.alignment,
            layoutScaleFactor: layoutScaleFactor !== null && layoutScaleFactor !== void 0 ? layoutScaleFactor : this.layoutScaleFactor,
            minX: minX !== null && minX !== void 0 ? minX : this.minX,
            minY: minY !== null && minY !== void 0 ? minY : this.minY,
            maxX: maxX !== null && maxX !== void 0 ? maxX : this.maxX,
            maxY: maxY !== null && maxY !== void 0 ? maxY : this.maxY,
        });
    };
    // Returns fit for the Wasm runtime format
    Layout.prototype.runtimeFit = function (rive) {
        if (this.cachedRuntimeFit)
            return this.cachedRuntimeFit;
        var fit;
        if (this.fit === Fit.Cover)
            fit = rive.Fit.cover;
        else if (this.fit === Fit.Contain)
            fit = rive.Fit.contain;
        else if (this.fit === Fit.Fill)
            fit = rive.Fit.fill;
        else if (this.fit === Fit.FitWidth)
            fit = rive.Fit.fitWidth;
        else if (this.fit === Fit.FitHeight)
            fit = rive.Fit.fitHeight;
        else if (this.fit === Fit.ScaleDown)
            fit = rive.Fit.scaleDown;
        else if (this.fit === Fit.Layout)
            fit = rive.Fit.layout;
        else
            fit = rive.Fit.none;
        this.cachedRuntimeFit = fit;
        return fit;
    };
    // Returns alignment for the Wasm runtime format
    Layout.prototype.runtimeAlignment = function (rive) {
        if (this.cachedRuntimeAlignment)
            return this.cachedRuntimeAlignment;
        var alignment;
        if (this.alignment === Alignment.TopLeft)
            alignment = rive.Alignment.topLeft;
        else if (this.alignment === Alignment.TopCenter)
            alignment = rive.Alignment.topCenter;
        else if (this.alignment === Alignment.TopRight)
            alignment = rive.Alignment.topRight;
        else if (this.alignment === Alignment.CenterLeft)
            alignment = rive.Alignment.centerLeft;
        else if (this.alignment === Alignment.CenterRight)
            alignment = rive.Alignment.centerRight;
        else if (this.alignment === Alignment.BottomLeft)
            alignment = rive.Alignment.bottomLeft;
        else if (this.alignment === Alignment.BottomCenter)
            alignment = rive.Alignment.bottomCenter;
        else if (this.alignment === Alignment.BottomRight)
            alignment = rive.Alignment.bottomRight;
        else
            alignment = rive.Alignment.center;
        this.cachedRuntimeAlignment = alignment;
        return alignment;
    };
    return Layout;
}());

// #endregion
// #region runtime

// #endregion
// #region state machines
/**
 * @deprecated State machine inputs are deprecated and will be removed in a
 * future major version: please use data binding properties instead. See
 * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
 * for how to migrate.
 */
var StateMachineInputType;
(function (StateMachineInputType) {
    StateMachineInputType[StateMachineInputType["Number"] = 56] = "Number";
    StateMachineInputType[StateMachineInputType["Trigger"] = 58] = "Trigger";
    StateMachineInputType[StateMachineInputType["Boolean"] = 59] = "Boolean";
})(StateMachineInputType || (StateMachineInputType = {}));
/**
 * An input for a state machine
 * @deprecated State machine inputs are deprecated and will be removed in a
 * future major version: please use data binding properties instead. See
 * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
 * for how to migrate.
 */
var StateMachineInput = /** @class */ (function () {
    function StateMachineInput(type, runtimeInput, onChange) {
        this.type = type;
        this.runtimeInput = runtimeInput;
        this.onChange = onChange;
    }
    Object.defineProperty(StateMachineInput.prototype, "name", {
        /**
         * Returns the name of the input
         */
        get: function () {
            return this.runtimeInput.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateMachineInput.prototype, "value", {
        /**
         * Returns the current value of the input
         */
        get: function () {
            return this.runtimeInput.value;
        },
        /**
         * Sets the value of the input
         */
        set: function (value) {
            var _a;
            this.runtimeInput.value = value;
            (_a = this.onChange) === null || _a === void 0 ? void 0 : _a.call(this);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Fires a trigger; does nothing on Number or Boolean input types
     */
    StateMachineInput.prototype.fire = function () {
        var _a;
        if (this.type === StateMachineInputType.Trigger) {
            this.runtimeInput.fire();
            (_a = this.onChange) === null || _a === void 0 ? void 0 : _a.call(this);
        }
    };
    /**
     * Deletes the input
     */
    StateMachineInput.prototype.delete = function () {
        this.runtimeInput = null;
    };
    return StateMachineInput;
}());

/**
 * @deprecated Subscribing to Rive Events at runtime is deprecated and will be removed in a future major
 * version: please use data binding instead. See
 * {@link https://rive.app/docs/runtimes/web/rive-events} for how to migrate.
 */
var RiveEventType;
(function (RiveEventType) {
    RiveEventType[RiveEventType["General"] = 128] = "General";
    RiveEventType[RiveEventType["OpenUrl"] = 131] = "OpenUrl";
})(RiveEventType || (RiveEventType = {}));
var BaseArtboard = /** @class */ (function () {
    function BaseArtboard(_isBindableArtboard) {
        this.isBindableArtboard = false;
        this.isBindableArtboard = _isBindableArtboard;
    }
    return BaseArtboard;
}());
var Artboard = /** @class */ (function (_super) {
    __extends(Artboard, _super);
    function Artboard(artboard, _file) {
        var _this = _super.call(this, false) || this;
        _this.nativeArtboard = artboard;
        _this.file = _file;
        return _this;
    }
    return Artboard;
}(BaseArtboard));
var BindableArtboard = /** @class */ (function (_super) {
    __extends(BindableArtboard, _super);
    function BindableArtboard(artboard) {
        var _this = _super.call(this, true) || this;
        _this.selfUnref = false;
        _this.nativeArtboard = artboard;
        return _this;
    }
    Object.defineProperty(BindableArtboard.prototype, "viewModel", {
        set: function (value) {
            this.nativeViewModel = value.nativeInstance;
        },
        enumerable: false,
        configurable: true
    });
    BindableArtboard.prototype.destroy = function () {
        var _a;
        if (this.selfUnref) {
            this.nativeArtboard.unref();
            (_a = this.nativeViewModel) === null || _a === void 0 ? void 0 : _a.unref();
        }
    };
    return BindableArtboard;
}(BaseArtboard));
var StateMachine = /** @class */ (function () {
    /**
     * @constructor
     * @param stateMachine runtime state machine object
     * @param instance runtime state machine instance object
     */
    function StateMachine(stateMachine, runtime, playing, artboard, onInputChange) {
        this.stateMachine = stateMachine;
        this.playing = playing;
        this.artboard = artboard;
        this.onInputChange = onInputChange;
        /**
         * Caches the inputs from the runtime
         */
        this.inputs = [];
        this.instance = new runtime.StateMachineInstance(stateMachine, artboard);
        this.initInputs(runtime);
    }
    Object.defineProperty(StateMachine.prototype, "hasFocusNodes", {
        /**
         * Whether this state machine has focus nodes
         */
        get: function () {
            return this.instance.hasFocusNodes();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateMachine.prototype, "name", {
        get: function () {
            return this.stateMachine.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateMachine.prototype, "statesChanged", {
        /**
         * Returns a list of state names that have changed on this frame
         */
        get: function () {
            var names = [];
            for (var i = 0; i < this.instance.stateChangedCount(); i++) {
                names.push(this.instance.stateChangedNameByIndex(i));
            }
            return names;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Advances the state machine instance by a given time.
     * @param time - the time to advance the animation by in seconds
     */
    StateMachine.prototype.advance = function (time) {
        this.instance.advance(time);
    };
    /**
     * Advances the state machine instance by a given time and apply changes to artboard.
     * @param time - the time to advance the animation by in seconds
     * @returns false once the state machine has nothing left to animate
     */
    StateMachine.prototype.advanceAndApply = function (time) {
        return this.instance.advanceAndApply(time);
    };
    /**
     * Enables semantic tree tracking for this state machine instance.
     */
    StateMachine.prototype.enableSemantics = function () {
        this.instance.enableSemantics();
    };
    /**
     * Returns the incremental semantic diff since the last call, or null
     * if semantics is not enabled or nothing changed.
     */
    StateMachine.prototype.drainSemanticsDiff = function () {
        return this.instance.drainSemanticsDiff();
    };
    /**
     * Fire a semantic action (tap, increase, decrease) on a node.
     * @param nodeId - The semantic node ID to target
     * @param actionType - 0 = tap, 1 = increase, 2 = decrease
     */
    StateMachine.prototype.fireSemanticAction = function (nodeId, actionType) {
        var _a;
        (_a = this.onInputChange) === null || _a === void 0 ? void 0 : _a.call(this);
        this.instance.fireSemanticAction(nodeId, actionType);
    };
    /**
     * When tools that enable accessible experiences traverse elements with focus,
     * we should call this method to focus the semantic node. It will also trigger
     * focus on any Focus listeners for this node
     * @param nodeId ID of the Semantic Node to focus
     * @returns boolean - True if focus was set, false otherwise
     */
    StateMachine.prototype.focusSemanticNode = function (nodeId) {
        var _a;
        (_a = this.onInputChange) === null || _a === void 0 ? void 0 : _a.call(this);
        return this.instance.focusSemanticNode(nodeId);
    };
    /**
     * Returns the number of events reported from the last advance call
     * @returns Number of events reported
     */
    StateMachine.prototype.reportedEventCount = function () {
        return this.instance.reportedEventCount();
    };
    /**
     * Returns a RiveEvent object emitted from the last advance call at the given index
     * of a list of potentially multiple events. If an event at the index is not found,
     * undefined is returned.
     * @param i index of the event reported in a list of potentially multiple events
     * @returns RiveEvent or extended RiveEvent object returned, or undefined
     */
    StateMachine.prototype.reportedEventAt = function (i) {
        return this.instance.reportedEventAt(i);
    };
    /**
     * Fetches references to the state machine's inputs and caches them
     * @param runtime an instance of the runtime; needed for the SMIInput types
     */
    StateMachine.prototype.initInputs = function (runtime) {
        // Fetch the inputs from the runtime if we don't have them
        for (var i = 0; i < this.instance.inputCount(); i++) {
            var input = this.instance.input(i);
            this.inputs.push(this.mapRuntimeInput(input, runtime));
        }
    };
    /**
     * Maps a runtime input to it's appropriate type
     * @param input
     */
    StateMachine.prototype.mapRuntimeInput = function (input, runtime) {
        if (input.type === runtime.SMIInput.bool) {
            return new StateMachineInput(StateMachineInputType.Boolean, input.asBool(), this.onInputChange);
        }
        else if (input.type === runtime.SMIInput.number) {
            return new StateMachineInput(StateMachineInputType.Number, input.asNumber(), this.onInputChange);
        }
        else if (input.type === runtime.SMIInput.trigger) {
            return new StateMachineInput(StateMachineInputType.Trigger, input.asTrigger(), this.onInputChange);
        }
    };
    /**
     * Deletes the backing Wasm state machine instance; once this is called, this
     * state machine is no more.
     */
    StateMachine.prototype.cleanup = function () {
        this.inputs.forEach(function (input) {
            input.delete();
        });
        this.inputs.length = 0;
        this.instance.delete();
    };
    StateMachine.prototype.bindViewModelInstance = function (viewModelInstance) {
        if (viewModelInstance.runtimeInstance != null) {
            this.instance.bindViewModelInstance(viewModelInstance.runtimeInstance);
        }
    };
    /**
     * Get metadata about the state of focus if applicable for this state machine.
     * @returns FocusState - { hasFocus: boolean, expectsKeyboardInput: boolean, expectsTextInput: boolean }
     */
    StateMachine.prototype.focusState = function () {
        return this.instance.focusState();
    };
    /**
     * Clear focus from the Rive focus node tree.
     */
    StateMachine.prototype.clearFocus = function () {
        var _a;
        (_a = this.onInputChange) === null || _a === void 0 ? void 0 : _a.call(this);
        this.instance.clearFocus();
    };
    return StateMachine;
}());
// #endregion
// #region animator
/**
 * Manages animation
 */
var Animator = /** @class */ (function () {
    /**
     * Constructs a new animator
     * @constructor
     * @param runtime Rive runtime; needed to instance animations & state machines
     * @param artboard the artboard that holds all animations and state machines
     * @param animations optional list of animations
     * @param stateMachines optional list of state machines
     */
    function Animator(runtime, artboard, eventManager, animations, stateMachines) {
        if (animations === void 0) { animations = []; }
        if (stateMachines === void 0) { stateMachines = []; }
        this.runtime = runtime;
        this.artboard = artboard;
        this.eventManager = eventManager;
        this.animations = animations;
        this.stateMachines = stateMachines;
    }
    /**
     * Adds animations and state machines by their names. If names are shared
     * between animations & state machines, then the first one found will be
     * created. Best not to use the same names for these in your Rive file.
     * @param animatable the name(s) of animations and state machines to add
     * @returns a list of names of the playing animations and state machines
     */
    Animator.prototype.add = function (animatables, playing, fireEvent, semanticsActive) {
        if (fireEvent === void 0) { fireEvent = true; }
        if (semanticsActive === void 0) { semanticsActive = false; }
        animatables = mapToStringArray(animatables);
        // If animatables is empty, play or pause everything
        if (animatables.length === 0) {
            this.animations.forEach(function (a) { return (a.playing = playing); });
            this.stateMachines.forEach(function (m) { return (m.playing = playing); });
        }
        else {
            // Play/pause already instanced items, or create new instances
            var instancedAnimationNames = this.animations.map(function (a) { return a.name; });
            var instancedMachineNames = this.stateMachines.map(function (m) { return m.name; });
            for (var i = 0; i < animatables.length; i++) {
                var aIndex = instancedAnimationNames.indexOf(animatables[i]);
                var mIndex = instancedMachineNames.indexOf(animatables[i]);
                if (aIndex >= 0 || mIndex >= 0) {
                    if (aIndex >= 0) {
                        // Animation is instanced, play/pause it
                        this.animations[aIndex].playing = playing;
                    }
                    else {
                        // State machine is instanced, play/pause it
                        this.stateMachines[mIndex].playing = playing;
                    }
                }
                else {
                    // Try to create a new animation instance
                    var anim = this.artboard.animationByName(animatables[i]);
                    if (anim) {
                        var newAnimation = new _animation__WEBPACK_IMPORTED_MODULE_0__.Animation(anim, this.artboard, this.runtime, playing);
                        // Display the first frame of the specified animation
                        newAnimation.advance(0);
                        newAnimation.apply(1.0);
                        this.animations.push(newAnimation);
                    }
                    else {
                        // Try to create a new state machine instance
                        var sm = this.artboard.stateMachineByName(animatables[i]);
                        if (sm) {
                            var newStateMachine = new StateMachine(sm, this.runtime, playing, this.artboard, this.onInputChange);
                            if (semanticsActive) {
                                newStateMachine.enableSemantics();
                            }
                            this.stateMachines.push(newStateMachine);
                        }
                    }
                }
            }
        }
        // Fire play/paused events for animations
        if (fireEvent) {
            if (playing) {
                this.eventManager.fire({
                    type: EventType.Play,
                    data: this.playing,
                });
            }
            else {
                this.eventManager.fire({
                    type: EventType.Pause,
                    data: this.paused,
                });
            }
        }
        return playing ? this.playing : this.paused;
    };
    /**
     * Adds linear animations by their names.
     * @param animatables the name(s) of animations to add
     * @param playing whether animations should play on instantiation
     */
    Animator.prototype.initLinearAnimations = function (animatables, playing, isFallingBackFromStateMachines) {
        if (isFallingBackFromStateMachines === void 0) { isFallingBackFromStateMachines = false; }
        // Play/pause already instanced items, or create new instances
        // This validation is kept to maintain compatibility with current behavior.
        // But given that it this is called during artboard initialization
        // it should probably be safe to remove.
        var instancedAnimationNames = this.animations.map(function (a) { return a.name; });
        for (var i = 0; i < animatables.length; i++) {
            var aIndex = instancedAnimationNames.indexOf(animatables[i]);
            if (aIndex >= 0) {
                this.animations[aIndex].playing = playing;
            }
            else {
                // Try to create a new animation instance
                var anim = this.artboard.animationByName(animatables[i]);
                if (anim) {
                    var newAnimation = new _animation__WEBPACK_IMPORTED_MODULE_0__.Animation(anim, this.artboard, this.runtime, playing);
                    // Display the first frame of the specified animation
                    newAnimation.advance(0);
                    newAnimation.apply(1.0);
                    this.animations.push(newAnimation);
                }
                else if (isFallingBackFromStateMachines) { // Throw LoadError if we cannot load the state machine name at all
                    var smInitializationMessage = "State Machine with name ".concat(animatables[i], " not found");
                    throw new RiveError(smInitializationMessage);
                }
                else {
                    console.error("Animation with name ".concat(animatables[i], " not found."));
                }
            }
        }
    };
    /**
     * Adds state machines by their names.
     * @param animatables the name(s) of state machines to add
     * @param playing whether state machines should play on instantiation
     */
    Animator.prototype.initStateMachines = function (animatables, playing, semanticsActive) {
        // Play/pause already instanced items, or create new instances
        // This validation is kept to maintain compatibility with current behavior.
        // But given that it this is called during artboard initialization
        // it should probably be safe to remove.
        var instancedStateMachineNames = this.stateMachines.map(function (a) { return a.name; });
        for (var i = 0; i < animatables.length; i++) {
            var aIndex = instancedStateMachineNames.indexOf(animatables[i]);
            if (aIndex >= 0) {
                this.stateMachines[aIndex].playing = playing;
            }
            else {
                // Try to create a new state machine instance
                var sm = this.artboard.stateMachineByName(animatables[i]);
                if (sm) {
                    var newStateMachine = new StateMachine(sm, this.runtime, playing, this.artboard, this.onInputChange);
                    if (semanticsActive) {
                        newStateMachine.enableSemantics();
                    }
                    this.stateMachines.push(newStateMachine);
                }
                else {
                    console.warn("State Machine with name ".concat(animatables[i], " not found. Falling back to find an animation with the same name."));
                    // TODO: Remove this fallback in next major release as it complicates initialization.
                    // In order to maintain compatibility with current behavior, if a state machine is not found
                    // we look for an animation with the same name
                    this.initLinearAnimations([animatables[i]], playing, true);
                }
            }
        }
    };
    /**
     * Play the named animations/state machines
     * @param animatables the names of the animations/machines to play; plays all if empty
     * @returns a list of the playing items
     */
    Animator.prototype.play = function (animatables) {
        return this.add(animatables, true);
    };
    /**
     * Advance state machines if they are paused after initialization
     */
    Animator.prototype.advanceIfPaused = function () {
        this.stateMachines.forEach(function (sm) {
            if (!sm.playing) {
                sm.advanceAndApply(0);
            }
        });
    };
    /**
     * Pauses named animations and state machines, or everything if nothing is
     * specified
     * @param animatables names of the animations and state machines to pause
     * @returns a list of names of the animations and state machines paused
     */
    Animator.prototype.pause = function (animatables) {
        return this.add(animatables, false);
    };
    /**
     * Set time of named animations
     * @param animations names of the animations to scrub
     * @param value time scrub value, a floating point number to which the playhead is jumped
     * @returns a list of names of the animations that were scrubbed
     */
    Animator.prototype.scrub = function (animatables, value) {
        var forScrubbing = this.animations.filter(function (a) {
            return animatables.includes(a.name);
        });
        forScrubbing.forEach(function (a) { return (a.scrubTo = value); });
        return forScrubbing.map(function (a) { return a.name; });
    };
    Object.defineProperty(Animator.prototype, "playing", {
        /**
         * Returns a list of names of all animations and state machines currently
         * playing
         */
        get: function () {
            return this.animations
                .filter(function (a) { return a.playing; })
                .map(function (a) { return a.name; })
                .concat(this.stateMachines.filter(function (m) { return m.playing; }).map(function (m) { return m.name; }));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animator.prototype, "paused", {
        /**
         * Returns a list of names of all animations and state machines currently
         * paused
         */
        get: function () {
            return this.animations
                .filter(function (a) { return !a.playing; })
                .map(function (a) { return a.name; })
                .concat(this.stateMachines.filter(function (m) { return !m.playing; }).map(function (m) { return m.name; }));
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Stops and removes all named animations and state machines
     * @param animatables animations and state machines to remove
     * @returns a list of names of removed items
     */
    Animator.prototype.stop = function (animatables) {
        var _this = this;
        animatables = mapToStringArray(animatables);
        // If nothing's specified, wipe them out, all of them
        var removedNames = [];
        // Stop everything
        if (animatables.length === 0) {
            removedNames = this.animations
                .map(function (a) { return a.name; })
                .concat(this.stateMachines.map(function (m) { return m.name; }));
            // Clean up before emptying the arrays
            this.animations.forEach(function (a) { return a.cleanup(); });
            this.stateMachines.forEach(function (m) { return m.cleanup(); });
            // Empty out the arrays
            this.animations.splice(0, this.animations.length);
            this.stateMachines.splice(0, this.stateMachines.length);
        }
        else {
            // Remove only the named animations/state machines
            var animationsToRemove = this.animations.filter(function (a) {
                return animatables.includes(a.name);
            });
            animationsToRemove.forEach(function (a) {
                a.cleanup();
                _this.animations.splice(_this.animations.indexOf(a), 1);
            });
            var machinesToRemove = this.stateMachines.filter(function (m) {
                return animatables.includes(m.name);
            });
            machinesToRemove.forEach(function (m) {
                m.cleanup();
                _this.stateMachines.splice(_this.stateMachines.indexOf(m), 1);
            });
            removedNames = animationsToRemove
                .map(function (a) { return a.name; })
                .concat(machinesToRemove.map(function (m) { return m.name; }));
        }
        this.eventManager.fire({
            type: EventType.Stop,
            data: removedNames,
        });
        // Return the list of animations removed
        return removedNames;
    };
    Object.defineProperty(Animator.prototype, "isPlaying", {
        /**
         * Returns true if at least one animation is active
         */
        get: function () {
            return (this.animations.reduce(function (acc, curr) { return acc || curr.playing; }, false) ||
                this.stateMachines.reduce(function (acc, curr) { return acc || curr.playing; }, false));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animator.prototype, "isPaused", {
        /**
         * Returns true if all animations are paused and there's at least one animation
         */
        get: function () {
            return (!this.isPlaying &&
                (this.animations.length > 0 || this.stateMachines.length > 0));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Animator.prototype, "isStopped", {
        /**
         * Returns true if there are no playing or paused animations/state machines
         */
        get: function () {
            return this.animations.length === 0 && this.stateMachines.length === 0;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * If there are no animations or state machines, add the first one found
     * @returns the name of the animation or state machine instanced
     */
    Animator.prototype.atLeastOne = function (playing, fireEvent, semanticsActive) {
        if (fireEvent === void 0) { fireEvent = true; }
        if (semanticsActive === void 0) { semanticsActive = false; }
        var instancedName;
        if (this.animations.length === 0 && this.stateMachines.length === 0) {
            if (this.artboard.animationCount() > 0) {
                // Warn only when the v3 default would actually change what plays
                if (this.artboard.stateMachineCount() > 0) {
                    warnOnce(DeprecationKeys.defaultStateMachine, "No `stateMachine` was specified, so the artboard's first linear animation is playing by default. " +
                        "In the next major version, the artboard's state machine will be played by default instead when one exists. " +
                        "Pass the `stateMachine` parameter to adopt that behavior now.");
                }
                // Add the first animation
                this.add([(instancedName = this.artboard.animationByIndex(0).name)], playing, fireEvent);
            }
            else if (this.artboard.stateMachineCount() > 0) {
                // Add the first state machine
                this.add([(instancedName = this.artboard.stateMachineByIndex(0).name)], playing, fireEvent, semanticsActive);
            }
        }
        return instancedName;
    };
    /**
     * Checks if any animations have looped and if so, fire the appropriate event
     */
    Animator.prototype.handleLooping = function () {
        for (var _i = 0, _a = this.animations.filter(function (a) { return a.playing; }); _i < _a.length; _i++) {
            var animation = _a[_i];
            // Emit if the animation looped
            if (animation.loopValue === 0 && animation.loopCount) {
                animation.loopCount = 0;
                // This is a one-shot; if it has ended, delete the instance
                this.stop(animation.name);
            }
            else if (animation.loopValue === 1 && animation.loopCount) {
                this.eventManager.fire({
                    type: EventType.Loop,
                    data: { animation: animation.name, type: LoopType.Loop },
                });
                animation.loopCount = 0;
            }
            // Wasm indicates a loop at each time the animation
            // changes direction, so a full loop/lap occurs every
            // two loop counts
            else if (animation.loopValue === 2 && animation.loopCount > 1) {
                this.eventManager.fire({
                    type: EventType.Loop,
                    data: { animation: animation.name, type: LoopType.PingPong },
                });
                animation.loopCount = 0;
            }
        }
    };
    /**
     * Checks if states have changed in state machines and fires a statechange
     * event
     */
    Animator.prototype.handleStateChanges = function () {
        var statesChanged = [];
        for (var _i = 0, _a = this.stateMachines.filter(function (sm) { return sm.playing; }); _i < _a.length; _i++) {
            var stateMachine = _a[_i];
            statesChanged.push.apply(statesChanged, stateMachine.statesChanged);
        }
        if (statesChanged.length > 0) {
            this.eventManager.fire({
                type: EventType.StateChange,
                data: statesChanged,
            });
        }
    };
    Animator.prototype.handleAdvancing = function (time) {
        this.eventManager.fire({
            type: EventType.Advance,
            data: time,
        });
    };
    return Animator;
}());
// #endregion
// #region events
/**
 * Supported event types triggered in Rive
 */
var EventType;
(function (EventType) {
    EventType["Load"] = "load";
    EventType["LoadError"] = "loaderror";
    EventType["Play"] = "play";
    EventType["Pause"] = "pause";
    EventType["Stop"] = "stop";
    /**
     * @deprecated Loop events are deprecated and will be removed in a future
     * major version: they are only reported for linear animation playback, which
     * is deprecated. Use a state machine to control playback and data binding to
     * react to changes instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide} for how
     * to migrate.
     */
    EventType["Loop"] = "loop";
    EventType["Draw"] = "draw";
    EventType["Advance"] = "advance";
    /**
     * @deprecated Subscribing to state change events at runtime is deprecated
     * and will be removed in a future major version: use data binding (view model
     * property observers) or state machine actions to react to changes from your
     * graphic instead. See
     * {@link https://rive.app/docs/editor/state-machine/states#actions} for more details.
     */
    EventType["StateChange"] = "statechange";
    /**
     * @deprecated Subscribing to Rive Events at runtime is deprecated and will be removed in a future
     * major version: please use data binding instead. See
     * {@link https://rive.app/docs/runtimes/web/rive-events} for how to migrate.
     */
    EventType["RiveEvent"] = "riveevent";
    EventType["AudioStatusChange"] = "audiostatuschange";
})(EventType || (EventType = {}));
var riveEventsDeprecationWarning = "Subscribing to Rive Events at runtime is deprecated and will be removed in a future major version: " +
    "please use data binding instead. See " +
    "https://rive.app/docs/runtimes/web/rive-events for how to migrate.";
var stateMachineInputsDeprecationWarning = "State machine inputs are deprecated and will be removed in a future major version: " +
    "please use data binding properties instead. See " +
    "https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs for how to migrate.";
var textRunsDeprecationWarning = "Text run APIs are deprecated and will be removed in a future major version: " +
    "please use data binding instead. See " +
    "https://rive.app/docs/editor/data-binding/migration-guide#updating-text-runs-at-runtime for how to migrate.";
var loopEventsDeprecationWarning = "Loop events are deprecated and will be removed in a future major version: " +
    "they are only reported for linear animation playback, which is deprecated. " +
    "Use a state machine to control playback and data binding to react to changes instead. See " +
    "https://rive.app/docs/editor/data-binding/migration-guide for how to migrate.";
var stateChangeEventsDeprecationWarning = "Subscribing to state change events at runtime is deprecated and will be removed in a future major version: " +
    "use data binding (view model property observers) or state machine actions to react to " +
    "changes from your graphic instead. See " +
    "https://rive.app/docs/editor/state-machine/states#actions for how to migrate.";
/**
 * The deprecations this runtime warns about. Each warning prints its own id, so
 * the value can be copied straight out of the console into
 * {@link Rive.suppressDeprecationWarnings}.
 */
var DeprecationKeys = {
    animationNames: "animation-names",
    animationsParam: "animations-param",
    defaultStateMachine: "default-state-machine",
    legacyConstructors: "legacy-constructors",
    legacyUnsubscribe: "legacy-unsubscribe",
    loopEvents: "loop-events",
    namesArray: "names-array",
    riveEvents: "rive-events",
    scrub: "scrub",
    stateChangeEvents: "state-change-events",
    stateMachineInputs: "state-machine-inputs",
    stateMachinesParam: "state-machines-param",
    textRuns: "text-runs",
};
// Derived from `DeprecationKeys`
var deprecationIds = new Set(Object.keys(DeprecationKeys).map(function (name) { return DeprecationKeys[name]; }));
// Deprecations that a consumer has opted out of. Kept at module scope so
// `warnOnce` can read it without referencing the `Rive` class
var suppressedDeprecations = new Set();
/** @internal Backing store for `Rive.suppressDeprecationWarnings`. */
var setSuppressedDeprecations = function (ids) {
    suppressedDeprecations.clear();
    if (!Array.isArray(ids)) {
        console.warn("[Rive] `suppressDeprecationWarnings` expects an array of deprecation ids, " +
            "received ".concat(typeof ids, ". Nothing was suppressed."));
        return;
    }
    for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
        var id = ids_1[_i];
        if (deprecationIds.has(id)) {
            suppressedDeprecations.add(id);
        }
    }
};
// Deprecation warnings already emitted; each is logged at most once per page
// session to avoid flooding the console when many instances are created.
var emittedWarnings = new Set();
/**
 * Logs a deprecation warning at most once per page session, unless its id has
 * been passed to `Rive.suppressDeprecationWarnings`.
 */
var warnOnce = function (id, message) {
    if (suppressedDeprecations.has(id)) {
        return;
    }
    var key = "".concat(id, ":").concat(message);
    if (emittedWarnings.has(key)) {
        return;
    }
    emittedWarnings.add(key);
    console.warn("[Rive: ".concat(id, "] ").concat(message, "\n") +
        "To suppress this warning, set Rive.suppressDeprecationWarnings = [\"".concat(id, "\"]"));
};
/**
 * Warns that a playback-control method received an array of names; the next
 * major version restricts these parameters to a single string, since playing
 * multiple animations or state machines at once will not be supported.
 */
var warnIfNamesArray = function (names, methodName) {
    if (Array.isArray(names)) {
        warnOnce(DeprecationKeys.namesArray, "Passing an array of names to `".concat(methodName, "()` is deprecated: in the next major version this parameter will be a single string, and playing multiple animations or state machines at once will not be supported."));
    }
};
/**
 * Warns that a playback-control method received linear animation names;
 * name-based control remains supported for state machines only, so
 * user-specified linear animation names are going away in a future major
 * version.
 */
var warnDeprecatedAnimationNames = function (methodName) {
    warnOnce(DeprecationKeys.animationNames, "Passing linear animation names to `".concat(methodName, "()` is deprecated and will be removed in a future major version: ") +
        "Pass a single state machine name to control playback instead.");
};
/**
 * Looping types: one-shot, loop, and ping-pong
 * @deprecated Loop events are deprecated and will be removed in a future major
 * version: they are only reported for linear animation playback, which is
 * deprecated. Use a state machine to control playback and data binding to
 * react to changes instead.
 */
var LoopType;
(function (LoopType) {
    LoopType["OneShot"] = "oneshot";
    LoopType["Loop"] = "loop";
    LoopType["PingPong"] = "pingpong";
})(LoopType || (LoopType = {}));
// Manages Rive events and listeners
var EventManager = /** @class */ (function () {
    function EventManager(listeners) {
        if (listeners === void 0) { listeners = []; }
        this.listeners = listeners;
    }
    // Gets listeners of specified type
    EventManager.prototype.getListeners = function (type) {
        return this.listeners.filter(function (e) { return e.type === type; });
    };
    // Adds a listener
    EventManager.prototype.add = function (listener) {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    };
    /**
     * Removes a listener
     * @param listener the listener with the callback to be removed
     */
    EventManager.prototype.remove = function (listener) {
        // We can't simply look for the listener as it'll be a different instance to
        // one originally subscribed. Find all the listeners of the right type and
        // then check their callbacks which should match.
        for (var i = 0; i < this.listeners.length; i++) {
            var currentListener = this.listeners[i];
            if (currentListener.type === listener.type) {
                if (currentListener.callback === listener.callback) {
                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    };
    /**
     * Clears all listeners of specified type, or every listener if no type is
     * specified
     * @param type the type of listeners to clear, or all listeners if not
     * specified
     */
    EventManager.prototype.removeAll = function (type) {
        var _this = this;
        if (!type) {
            this.listeners.splice(0, this.listeners.length);
        }
        else {
            this.listeners
                .filter(function (l) { return l.type === type; })
                .forEach(function (l) { return _this.remove(l); });
        }
    };
    // Fires an event
    EventManager.prototype.fire = function (event) {
        var eventListeners = this.getListeners(event.type);
        eventListeners.forEach(function (listener) { return listener.callback(event); });
    };
    return EventManager;
}());
// Manages a queue of tasks
var TaskQueueManager = /** @class */ (function () {
    function TaskQueueManager(eventManager) {
        this.eventManager = eventManager;
        this.queue = [];
    }
    // Adds a task top the queue
    TaskQueueManager.prototype.add = function (task) {
        this.queue.push(task);
    };
    // Processes all tasks in the queue
    TaskQueueManager.prototype.process = function () {
        while (this.queue.length > 0) {
            var task = this.queue.shift();
            if (task === null || task === void 0 ? void 0 : task.action) {
                task.action();
            }
            if (task === null || task === void 0 ? void 0 : task.event) {
                this.eventManager.fire(task.event);
            }
        }
    };
    return TaskQueueManager;
}());
// #endregion
// #region Audio
var SystemAudioStatus;
(function (SystemAudioStatus) {
    SystemAudioStatus[SystemAudioStatus["AVAILABLE"] = 0] = "AVAILABLE";
    SystemAudioStatus[SystemAudioStatus["UNAVAILABLE"] = 1] = "UNAVAILABLE";
})(SystemAudioStatus || (SystemAudioStatus = {}));
// Class to handle audio context availability and status changes
var AudioManager = /** @class */ (function (_super) {
    __extends(AudioManager, _super);
    function AudioManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._started = false;
        _this._enabled = false;
        _this._status = SystemAudioStatus.UNAVAILABLE;
        return _this;
    }
    AudioManager.prototype.delay = function (time) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, time); })];
            });
        });
    };
    AudioManager.prototype.timeout = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (_, reject) { return setTimeout(reject, 50); })];
            });
        });
    };
    // Alerts animations on status changes and removes the listeners to avoid alerting twice.
    AudioManager.prototype.reportToListeners = function () {
        this.fire({ type: EventType.AudioStatusChange });
        this.removeAll();
    };
    /**
     * The audio context has been resolved.
     * Alert any listeners that we can now play audio.
     * Rive will now play audio at the configured volume.
     */
    AudioManager.prototype.enableAudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this._enabled) {
                    this._enabled = true;
                    this._status = SystemAudioStatus.AVAILABLE;
                    this.reportToListeners();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Check if we are able to play audio.
     *
     * We currently check the audio context, when resume() returns before a timeout we know that the
     * audio context is running and we can enable audio.
     */
    AudioManager.prototype.testAudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this._status === SystemAudioStatus.UNAVAILABLE &&
                            this._audioContext !== null)) return [3 /*break*/, 4];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.race([this._audioContext.resume(), this.timeout()])];
                    case 2:
                        _b.sent();
                        this.enableAudio();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Establish audio for use with rive.
     * We both test if we can use audio intermittently and listen for user interaction.
     * The aim is to enable audio playback as soon as the browser allows this.
     */
    AudioManager.prototype._establishAudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this._started) return [3 /*break*/, 5];
                        this._started = true;
                        if (!(typeof window == "undefined")) return [3 /*break*/, 1];
                        this.enableAudio();
                        return [3 /*break*/, 5];
                    case 1:
                        this._audioContext = new AudioContext();
                        this.listenForUserAction();
                        _a.label = 2;
                    case 2:
                        if (!(this._status === SystemAudioStatus.UNAVAILABLE)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.testAudio()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.delay(1000)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    AudioManager.prototype.listenForUserAction = function () {
        var _this = this;
        // NOTE: AudioContexts are ready immediately if requested in a ui callback
        // we *could* re request one in this listener.
        var _clickListener = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // note this has "better" results than calling `await this.testAudio()`
                // as we force audio to be enabled in the current thread, rather than chancing
                // the thread to be passed over for some other async context
                this.enableAudio();
                return [2 /*return*/];
            });
        }); };
        // NOTE: we should test this on mobile/pads
        document.addEventListener("pointerdown", _clickListener, {
            once: true,
        });
    };
    /**
     * Establish the audio context for rive, this lets rive know that we can play audio.
     */
    AudioManager.prototype.establishAudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this._establishAudio();
                return [2 /*return*/];
            });
        });
    };
    Object.defineProperty(AudioManager.prototype, "systemVolume", {
        get: function () {
            if (this._status === SystemAudioStatus.UNAVAILABLE) {
                // We do an immediate test to avoid depending on the delay of the running test
                this.testAudio();
                return 0;
            }
            return 1;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AudioManager.prototype, "status", {
        get: function () {
            return this._status;
        },
        enumerable: false,
        configurable: true
    });
    return AudioManager;
}(EventManager));
var audioManager = new AudioManager();
var FakeResizeObserver = /** @class */ (function () {
    function FakeResizeObserver() {
    }
    FakeResizeObserver.prototype.observe = function () { };
    FakeResizeObserver.prototype.unobserve = function () { };
    FakeResizeObserver.prototype.disconnect = function () { };
    return FakeResizeObserver;
}());
var MyResizeObserver = globalThis.ResizeObserver || FakeResizeObserver;
/**
 * This class takes care of any observers that will be attached to an animation.
 * It should be treated as a singleton because observers are much more performant
 * when used for observing multiple elements by a single instance.
 */
var ObjectObservers = /** @class */ (function () {
    function ObjectObservers() {
        var _this = this;
        this._elementsMap = new Map();
        /**
         * Resize observers trigger both when the element changes its size and also when the
         * element is added or removed from the document.
         */
        this._onObservedEntry = function (entry) {
            var observed = _this._elementsMap.get(entry.target);
            // An entry queued before remove() can still arrive after it.
            if (observed) {
                observed.onResize(entry.target.clientWidth == 0 || entry.target.clientHeight == 0);
            }
            else {
                _this._resizeObserver.unobserve(entry.target);
            }
        };
        this._onObserved = function (entries) {
            entries.forEach(_this._onObservedEntry);
        };
        this._resizeObserver = new MyResizeObserver(this._onObserved);
    }
    // Adds an observable element
    ObjectObservers.prototype.add = function (element, onResize) {
        var observed = {
            onResize: onResize,
            element: element,
        };
        this._elementsMap.set(element, observed);
        this._resizeObserver.observe(element);
        return observed;
    };
    // Removes an observable element
    ObjectObservers.prototype.remove = function (observed) {
        this._resizeObserver.unobserve(observed.element);
        this._elementsMap.delete(observed.element);
    };
    return ObjectObservers;
}());
var observers = new ObjectObservers();
// #endregion
// #region Rive
var nextRiveInstanceId = 0;
// Instances whose requestAnimationFrame stopped because they settled.
var settledInstances = new Set();
// Live instances created with enableSettling.
var settlingEnabledInstanceCount = 0;
// Bumped by every asset change. The change has no owning instance to wake, so
// draw() compares this to its frame-start value and doesn't settle if it moved.
var assetGeneration = 0;
/**
 * Resolves which animation/state machine names playback should start with.
 * The `stateMachine` parameter takes priority; the deprecated plural
 * `animations`/`stateMachines` parameters apply only when it
 * is not provided.
 */
var resolveStartingPlayback = function (_a) {
    var stateMachine = _a.stateMachine, animations = _a.animations, stateMachines = _a.stateMachines;
    if (animations !== undefined) {
        warnOnce(DeprecationKeys.animationsParam, "The `animations` parameter is deprecated and will be removed in a future major version: please use the `stateMachine` parameter to play a state machine instead.");
    }
    if (stateMachines !== undefined) {
        warnOnce(DeprecationKeys.stateMachinesParam, "The `stateMachines` parameter is deprecated: please use `stateMachine` with a single state machine name instead.");
    }
    if (stateMachine) {
        return {
            startingAnimationNames: [],
            startingStateMachineNames: [stateMachine],
        };
    }
    return {
        startingAnimationNames: mapToStringArray(animations),
        startingStateMachineNames: mapToStringArray(stateMachines),
    };
};
var RiveFile = /** @class */ (function () {
    function RiveFile(params) {
        // Allow the runtime to automatically load assets hosted in Rive's runtime.
        this.enableRiveAssetCDN = true;
        // Decode parts of the file on first use instead of at import.
        this.deferDecoding = false;
        // When true, emits performance.mark/measure entries during RiveFile load.
        this.enablePerfMarks = false;
        this.referenceCount = 0;
        this.destroyed = false;
        this.selfUnref = false;
        this.bindableArtboards = [];
        // Deferred rendering was requested; the session may still be null if this
        // build has no deferred support.
        this.deferred = false;
        // The session this file imported through, null when immediate. Owned here:
        // it has to outlive the file, so it is deleted after the file is released.
        this.session = null;
        // Attaching is once per session: a detached session can never replay again,
        // so a claimed file re-imports for the next instance implicitly. Mirrors the native
        // latch (WebGL2DeferredSession::everBound, C2DDeferredSession::claim).
        this._sessionClaimed = false;
        // Releasing this file has to be deterministic once a session owns its
        // resources, so the finalizer is disarmed rather than left to GC.
        this.fileFinalizer = null;
        this.boundElsewhereWarned = false;
        this.src = params.src;
        this.buffer = params.buffer;
        this.deferred = !!params.enableGPUCanvas;
        if (params.assetLoader)
            this.assetLoader = params.assetLoader;
        this.enableRiveAssetCDN =
            typeof params.enableRiveAssetCDN == "boolean"
                ? params.enableRiveAssetCDN
                : true;
        this.deferDecoding = !!params.deferDecoding;
        this.enablePerfMarks = !!params.enablePerfMarks;
        if (this.enablePerfMarks)
            _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.enablePerfMarks = true;
        // New event management system
        this.eventManager = new EventManager();
        if (params.onLoad)
            this.on(EventType.Load, params.onLoad);
        if (params.onLoadError)
            this.on(EventType.LoadError, params.onLoadError);
    }
    RiveFile.prototype.releaseFile = function () {
        var _a, _b;
        // Release here rather than leaving it to the finalization registry. The
        // native file frees GL-backed resources when its last reference goes, and
        // callers reach this with the renderer's context current; a finalizer runs
        // with none, so those deletes would silently do nothing.
        (_a = this.fileFinalizer) === null || _a === void 0 ? void 0 : _a.release();
        (_b = this.file) === null || _b === void 0 ? void 0 : _b.unref();
        this.fileFinalizer = null;
        this.file = null;
    };
    RiveFile.prototype.releaseSession = function () {
        var _a;
        // Known limitation: cleanup() on a file an instance is still drawing
        // deletes the session under it. A RiveFile's creator holds no reference of
        // its own, so their cleanup() can take the count to zero.
        (_a = this.session) === null || _a === void 0 ? void 0 : _a.delete();
        this.session = null;
    };
    RiveFile.prototype.releaseBindableArtboards = function () {
        this.bindableArtboards.forEach(function (bindableArtboard) {
            return bindableArtboard.destroy();
        });
    };
    RiveFile.prototype.initData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1, loader, loaderWrapper, _b, error_2, fileFinalizer;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(this.src && !this.buffer)) return [3 /*break*/, 4];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        _a = this;
                        return [4 /*yield*/, loadRiveFile(this.src)];
                    case 2:
                        _a.buffer = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _c.sent();
                        if (error_1 instanceof Error) {
                            throw error_1;
                        }
                        throw new RiveError(RiveFile.fileLoadErrorMessage);
                    case 4:
                        if (this.destroyed) {
                            return [2 /*return*/];
                        }
                        if (this.deferred && this.session === null) {
                            this.session = RiveFile.makeDeferredSession(this.runtime);
                        }
                        if (this.assetLoader) {
                            loaderWrapper = new _utils__WEBPACK_IMPORTED_MODULE_3__.CustomFileAssetLoaderWrapper(this.runtime, this.assetLoader, this.session);
                            loader = loaderWrapper.assetLoader;
                        }
                        // Load the Rive file
                        if (this.enablePerfMarks)
                            performance.mark('rive:file-load:start');
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        _b = this;
                        return [4 /*yield*/, this.runtime.load(new Uint8Array(this.buffer), loader, this.enableRiveAssetCDN, this.session, this.deferDecoding)];
                    case 6:
                        _b.file = _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _c.sent();
                        // The finalizer that would reclaim the session is only registered once
                        // the import succeeds, so a failed load has to release it here.
                        this.releaseSession();
                        throw error_2;
                    case 8:
                        if (this.enablePerfMarks) {
                            performance.mark('rive:file-load:end');
                            performance.measure('rive:file-load', 'rive:file-load:start', 'rive:file-load:end');
                        }
                        if (this.destroyed) {
                            this.releaseFile();
                            this.releaseSession();
                            return [2 /*return*/];
                        }
                        if (this.file === null) {
                            // A malformed file resolves to null rather than rejecting. Release the
                            // session now: a finalizer for a file that does not exist would keep it
                            // alive until GC, or for as long as the caller holds the failed RiveFile.
                            this.releaseSession();
                            this.fireLoadError(RiveFile.fileLoadErrorMessage);
                            return [2 /*return*/];
                        }
                        fileFinalizer = new _utils__WEBPACK_IMPORTED_MODULE_3__.FileFinalizer(this.file, this.session);
                        this.fileFinalizer = fileFinalizer;
                        _utils__WEBPACK_IMPORTED_MODULE_3__.finalizationRegistry.register(this, fileFinalizer);
                        this.eventManager.fire({
                            type: EventType.Load,
                            data: this,
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    RiveFile.prototype.loadRiveFileBytes = function () {
        return __awaiter(this, void 0, void 0, function () {
            var bufferPromise;
            return __generator(this, function (_a) {
                if (this.enablePerfMarks)
                    performance.mark('rive:fetch-riv:start');
                bufferPromise = this.src
                    ? loadRiveFile(this.src)
                    : Promise.resolve(this.buffer);
                if (this.enablePerfMarks && this.src) {
                    bufferPromise.then(function () {
                        performance.mark('rive:fetch-riv:end');
                        performance.measure('rive:fetch-riv', 'rive:fetch-riv:start', 'rive:fetch-riv:end');
                    });
                }
                return [2 /*return*/, bufferPromise];
            });
        });
    };
    RiveFile.prototype.loadRuntime = function () {
        return __awaiter(this, void 0, void 0, function () {
            var runtimePromise;
            return __generator(this, function (_a) {
                if (this.enablePerfMarks)
                    performance.mark('rive:await-wasm:start');
                runtimePromise = _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.awaitInstance();
                if (this.enablePerfMarks) {
                    runtimePromise.then(function () {
                        performance.mark('rive:await-wasm:end');
                        performance.measure('rive:await-wasm', 'rive:await-wasm:start', 'rive:await-wasm:end');
                    });
                }
                return [2 /*return*/, runtimePromise];
            });
        });
    };
    RiveFile.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, bufferResolved, runtimeResolved, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // If no source file url specified, it's a bust
                        if (!this.src && !this.buffer) {
                            this.fireLoadError(RiveFile.missingErrorMessage);
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, Promise.all([this.loadRiveFileBytes(), this.loadRuntime()])];
                    case 2:
                        _a = _b.sent(), bufferResolved = _a[0], runtimeResolved = _a[1];
                        if (this.destroyed) {
                            return [2 /*return*/];
                        }
                        // .riv file buffer and WASM runtime instance
                        this.buffer = bufferResolved;
                        this.runtime = runtimeResolved;
                        if (this.enablePerfMarks)
                            performance.mark('rive:init-data:start');
                        return [4 /*yield*/, this.initData()];
                    case 3:
                        _b.sent();
                        if (this.enablePerfMarks) {
                            performance.mark('rive:init-data:end');
                            performance.measure('rive:init-data', 'rive:init-data:start', 'rive:init-data:end');
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _b.sent();
                        this.fireLoadError(error_3 instanceof Error ? error_3.message : RiveFile.fileLoadErrorMessage);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    RiveFile.prototype.fireLoadError = function (message) {
        this.eventManager.fire({
            type: EventType.LoadError,
            data: message,
        });
        throw new RiveError(message);
    };
    /**
     * Subscribe to Rive-generated events
     * @param type the type of event to subscribe to
     * @param callback callback to fire when the event occurs
     */
    RiveFile.prototype.on = function (type, callback) {
        this.eventManager.add({
            type: type,
            callback: callback,
        });
    };
    /**
     * Unsubscribes from a Rive-generated event
     * @param type the type of event to unsubscribe from
     * @param callback the callback to unsubscribe
     */
    RiveFile.prototype.off = function (type, callback) {
        this.eventManager.remove({
            type: type,
            callback: callback,
        });
    };
    RiveFile.prototype.cleanup = function () {
        this.referenceCount -= 1;
        if (this.referenceCount <= 0) {
            this.removeAllRiveEventListeners();
            this.releaseFile();
            this.releaseBindableArtboards();
            // Everything imported through the session is gone; the session can go.
            this.releaseSession();
            this.destroyed = true;
        }
    };
    // Deferred is only compiled into some runtime builds, so feature detect it
    // and degrade to an immediate import rather than failing the load.
    RiveFile.makeDeferredSession = function (runtime) {
        var _a, _b;
        var session = (_b = (_a = runtime.makeDeferredSession) === null || _a === void 0 ? void 0 : _a.call(runtime)) !== null && _b !== void 0 ? _b : null;
        if (session === null && !RiveFile.deferredUnsupportedWarned) {
            RiveFile.deferredUnsupportedWarned = true;
            console.warn("Rive: `enableGPUCanvas: true` was ignored because this runtime build has no GPU Canvas support; importing in immediate mode. Use a @rive-app/webgl2 or @rive-app/canvas build with deferred rendering compiled in.");
        }
        return session;
    };
    Object.defineProperty(RiveFile.prototype, "deferredSession", {
        /**
         * @internal The deferred session this file imported through, or null if it
         * was imported in immediate mode.
         */
        get: function () {
            return this.session;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RiveFile.prototype, "deferredRequested", {
        /**
         * @internal Whether deferred was asked for, even when this build could not
         * honor it and imported immediate.
         */
        get: function () {
            return this.deferred;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RiveFile.prototype, "sessionClaimed", {
        /**
         * @internal Whether this file's session has ever been attached to a renderer.
         * Attaching is once per session, so a claimed file re-imports for the next
         * instance even after the renderer it was bound to is gone.
         */
        get: function () {
            return this._sessionClaimed;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @internal Marks this file's session as spent. There is no matching release:
     * a session that has been attached can never replay for another renderer.
     */
    RiveFile.prototype.claimSession = function () {
        this._sessionClaimed = true;
    };
    /**
     * @internal One warning per file however many instances collide on it.
     */
    RiveFile.prototype.warnBoundElsewhereOnce = function () {
        if (this.boundElsewhereWarned) {
            return;
        }
        this.boundElsewhereWarned = true;
        console.warn("Rive: this deferred RiveFile is already bound to another Rive instance's canvas, and a deferred session cannot span canvases. Re-importing the file for this instance (an extra parse of the retained buffer, no extra network request).");
    };
    /**
     * @internal Re-imports this file from its retained buffer into a mode of its
     * own. The copy is owned by whoever asked for it and never joins this file's
     * reference count.
     */
    RiveFile.prototype.reimport = function (deferred) {
        return __awaiter(this, void 0, void 0, function () {
            var copy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        copy = new RiveFile({
                            buffer: this.buffer,
                            assetLoader: this.assetLoader,
                            enableRiveAssetCDN: this.enableRiveAssetCDN,
                            deferDecoding: this.deferDecoding,
                            enablePerfMarks: this.enablePerfMarks,
                            enableGPUCanvas: deferred,
                        });
                        return [4 /*yield*/, copy.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, copy];
                }
            });
        });
    };
    /**
     * Unsubscribes all Rive listeners from an event type, or everything if no type is
     * given
     * @param type the type of event to unsubscribe from, or all types if
     * undefined
     */
    RiveFile.prototype.removeAllRiveEventListeners = function (type) {
        this.eventManager.removeAll(type);
    };
    RiveFile.prototype.getInstance = function () {
        if (this.file !== null) {
            this.referenceCount += 1;
            return this.file;
        }
    };
    RiveFile.prototype.destroyIfUnused = function () {
        if (this.referenceCount <= 0) {
            this.cleanup();
        }
    };
    RiveFile.prototype.createBindableArtboard = function (nativeBindableArtboard) {
        if (nativeBindableArtboard != null) {
            var bindableArtboard = new BindableArtboard(nativeBindableArtboard);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(bindableArtboard, bindableArtboard.nativeArtboard);
            this.bindableArtboards.push(bindableArtboard);
            return bindableArtboard;
        }
        return null;
    };
    /**
     * @deprecated This function is deprecated. For better stability and memory management
     * use `getBindableArtboard()` instead.
     * @param {string} name - The name of the artboard.
     * @returns {Artboard} The artboard to bind to.
     */
    RiveFile.prototype.getArtboard = function (name) {
        var nativeArtboard = this.file.artboardByName(name);
        if (nativeArtboard != null) {
            return new Artboard(nativeArtboard, this);
        }
    };
    RiveFile.prototype.getBindableArtboard = function (name) {
        var nativeArtboard = this.file.bindableArtboardByName(name);
        return this.createBindableArtboard(nativeArtboard);
    };
    RiveFile.prototype.getDefaultBindableArtboard = function () {
        var nativeArtboard = this.file.bindableArtboardDefault();
        return this.createBindableArtboard(nativeArtboard);
    };
    RiveFile.prototype.internalBindableArtboardFromArtboard = function (artboard) {
        var nativeBindableArtboard = this.file.internalBindableArtboardFromArtboard(artboard);
        return this.createBindableArtboard(nativeBindableArtboard);
    };
    RiveFile.prototype.viewModelByName = function (name) {
        var viewModel = this.file.viewModelByName(name);
        if (viewModel !== null) {
            return new ViewModel(viewModel);
        }
        return null;
    };
    /**
     * @returns the names of the file's global view models, in file order.
     */
    RiveFile.prototype.globalViewModelNames = function () {
        return this.file.globalViewModelNames();
    };
    // Error message for missing source or buffer
    RiveFile.missingErrorMessage = "Rive source file or data buffer required";
    // Error message for file load error
    RiveFile.fileLoadErrorMessage = "The file failed to load";
    // Deferred support is per build, so the warning is per page, not per file.
    RiveFile.deferredUnsupportedWarned = false;
    return RiveFile;
}());

var Rive = /** @class */ (function () {
    function Rive(params) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        // Tracks if a Rive file is loaded
        this.loaded = false;
        // Tracks if a Rive file is destroyed
        this.destroyed = false;
        // Reference of an object that handles any observers for the animation
        this._observed = null;
        /**
         * Tracks if a Rive file is loaded; we need this in addition to loaded as some
         * commands (e.g. contents) can be called as soon as the file is loaded.
         * However, playback commands need to be queued and run in order once initial
         * animations and autoplay has been sorted out. This applies to play, pause,
         * and start.
         */
        this.readyForPlaying = false;
        // Deferred rendering was requested for this instance. The file it renders
        // has the final say, since a file's mode is fixed at import.
        this.deferredRenderer = false;
        // Whether a deferred instance may hand its canvas to the replay worker.
        this.useReplayWorker = true;
        // Decides the context attributes on every init(); cleared if the renderer can't inkbleed.
        this._inkbleedCapable = false;
        this._inkbleed = false;
        // Whether this instance imported the file in `riveFile` (true) or the caller
        // supplied it (false). Only a file we imported may be released without a
        // matching getInstance(): a caller's file is theirs however this init ends.
        this.ownsRiveFile = false;
        // Runtime artboard
        this.artboard = null;
        // place to clear up pointer/touch event listeners
        this.eventCleanup = null;
        // Manages keyboard and DOM-focus interactions for the canvas.
        this._keyboardInteractions = null;
        // Polls game controllers and forwards input to the first playing state machine.
        this._gamepadInteractions = null;
        this.shouldDisableRiveListeners = false;
        this.shouldDisableGamepad = false;
        this._gamepadOptions = {
            requireFocus: false,
        };
        this.automaticallyHandleEvents = false;
        this.dispatchPointerExit = true;
        // Allow all pointers to be passed to the runtime
        this.enableMultiTouch = false;
        // Allow the runtime to automatically load assets hosted in Rive's runtime.
        this.enableRiveAssetCDN = true;
        // Forwarded to the file this instance imports itself.
        this.deferDecoding = false;
        this.semanticsMode = _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode.Disabled;
        this.semanticsOptions = {
            riveCanvasLabel: "Rive animation",
        };
        /** True when this instance may drain semantics and render the overlay. */
        this._semanticsActive = false;
        // Keep a local value of the set volume to update it asynchronously
        this._volume = 1;
        // Keep a local value of the set width to update it asynchronously
        this._artboardWidth = undefined;
        // Keep a local value of the set height to update it asynchronously
        this._artboardHeight = undefined;
        // Keep a local value of the device pixel ratio used in rendering and canvas/artboard resizing
        this._devicePixelRatioUsed = 1;
        // Whether the canvas element's size is 0
        this._hasZeroSize = false;
        // Whether a draw operation needs to be forced
        this._needsRedraw = false;
        // Canvas width and height. Values are lazily updated so they might
        // not be in sync with current canvas size.
        this._currentCanvasWidth = 0;
        this._currentCanvasHeight = 0;
        // Audio event listener
        this._audioEventListener = null;
        // draw method bound to the class
        this._boundDraw = null;
        // Page visibility handler — prevents state machine advancing / rAF from being invoked with large time delta
        // when the browser tab is switched back to after being hidden.
        this._pageVisibilityHandler = null;
        // True only when the page visibility handler itself cancelled an active frame.
        // Set by stopRendering(), cleared by startRendering(). Prevents the
        // visibilitychange handler from restarting a rendering loop the caller intentionally stopped.
        this._explicitlyStoppedRendering = false;
        this._enableSettling = false;
        // Bumped by every wake. draw() compares it to its frame-start value and
        // doesn't settle if a wake happened mid-frame (e.g. from a callback), since
        // that change wasn't advanced.
        this._wakeGeneration = 0;
        // Registered on bound view model instances so their writes restart this instance's loop.
        this._wakeFromViewModel = function () { return _this.wake(); };
        this._viewModelInstance = null;
        // User-provided global view model instances, keyed by their global view
        // model's name. Globals not present here are still driven by the default
        // instances the runtime seeds; the getter only surfaces instances the user
        // has explicitly set.
        this._globalViewModelInstances = new Map();
        this._dataEnums = null;
        this._tabIndex = null;
        this._prevHasFocus = false;
        this._prevWantsTextInputSession = false;
        // Pointer-down defers the proxy focus: mousedown's default would refocus the canvas and
        // touchstart isn't user activation; pointer-up focuses it.
        this._inPointerDownDrain = false;
        this._focusOptions = {
            allowFocusInterrupt: false,
        };
        // Tracks the semantic tree for the given graphic
        this._semanticTree = null;
        this._accessibilityOverlay = null;
        /**
         * True when an input to the accessibility overlay's artboard→canvas transform
         * (layout fit/alignment/bounds, devicePixelRatio, or layout scale) has changed
         * and the matrix must be recomputed on the next overlay update. Avoids calling
         * computeAlignment every frame when only the semantic tree changed.
         */
        this._overlayTransformDirty = true;
        // Module-level counter for unique instance IDs for semantic overlay containers
        this._instanceId = "".concat(nextRiveInstanceId++);
        this.drawOptimization = DrawOptimizationOptions.DrawOnChanged;
        // When true, emits performance.mark/measure entries for load and render.
        this.enablePerfMarks = false;
        // Durations to generate a frame for the last second. Used for performance profiling.
        this.durations = [];
        this.frameTimes = [];
        this.frameCount = 0;
        this.isTouchScrollEnabled = false;
        this.onCanvasResize = function (hasZeroSize) {
            var toggledDisplay = _this._hasZeroSize !== hasZeroSize;
            _this._hasZeroSize = hasZeroSize;
            if (!hasZeroSize) {
                if (toggledDisplay) {
                    _this.resizeDrawingSurfaceToCanvas();
                }
            }
            else if (!_this._layout.maxX || !_this._layout.maxY) {
                _this.resizeToCanvas();
            }
        };
        this.isEditingHostFocused = function () { var _a, _b; return (_b = (_a = _this._keyboardInteractions) === null || _a === void 0 ? void 0 : _a.isEditingHostFocused()) !== null && _b !== void 0 ? _b : false; };
        this.isFocusWithinCanvas = function () {
            var _a, _b, _c;
            if (typeof document === "undefined") {
                return false;
            }
            // Inside a shadow root, document.activeElement is the shadow host.
            var root = _this.canvas instanceof HTMLCanvasElement ? _this.canvas.getRootNode() : null;
            var active = (_a = (typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot
                ? root.activeElement
                : null)) !== null && _a !== void 0 ? _a : document.activeElement;
            if (!active) {
                return false;
            }
            // Canvas, overlay and the text input proxy.
            if (_this._keyboardInteractions) {
                return _this._keyboardInteractions.isInFocusDomain(active);
            }
            if (active === _this.canvas) {
                return true;
            }
            var overlay = (_c = (_b = _this._accessibilityOverlay) === null || _b === void 0 ? void 0 : _b.getSemanticOverlayContainer()) !== null && _c !== void 0 ? _c : null;
            return !!overlay && overlay.contains(active);
        };
        // rAF time of the last frame; 0 makes the next frame start the clock.
        this.lastRenderTime = 0;
        // Tracks the current animation frame request
        this.frameRequestId = null;
        this.replayPacer = new _utils__WEBPACK_IMPORTED_MODULE_3__.ReplayPacer();
        /**
         * Used be draw to track when a second of active rendering time has passed.
         * Used for debugging purposes
         */
        this.renderSecondTimer = 0;
        this._boundDraw = this.draw.bind(this);
        if (typeof document !== 'undefined') {
            this._pageVisibilityHandler = this._onPageVisibilityChange.bind(this);
            document.addEventListener('visibilitychange', this._pageVisibilityHandler);
        }
        this.canvas = params.canvas;
        if (params.canvas.constructor === HTMLCanvasElement) {
            this._observed = observers.add(this.canvas, this.onCanvasResize);
        }
        this._currentCanvasWidth = this.canvas.width;
        this._currentCanvasHeight = this.canvas.height;
        this.src = params.src;
        this.buffer = params.buffer;
        this.riveFile = params.riveFile;
        this.layout = (_a = params.layout) !== null && _a !== void 0 ? _a : new Layout();
        this.shouldDisableRiveListeners = !!params.shouldDisableRiveListeners;
        this.shouldDisableGamepad = !!params.shouldDisableGamepad;
        this._gamepadOptions = (_b = params.gamepadOptions) !== null && _b !== void 0 ? _b : this._gamepadOptions;
        this.isTouchScrollEnabled = !!params.isTouchScrollEnabled;
        if (params.automaticallyHandleEvents) {
            warnOnce(DeprecationKeys.riveEvents, "The `automaticallyHandleEvents` parameter is deprecated. " +
                riveEventsDeprecationWarning);
        }
        this.automaticallyHandleEvents = !!params.automaticallyHandleEvents;
        this.dispatchPointerExit =
            params.dispatchPointerExit === false
                ? params.dispatchPointerExit
                : this.dispatchPointerExit;
        this.enableMultiTouch = !!params.enableMultiTouch;
        this.drawOptimization = (_c = params.drawingOptions) !== null && _c !== void 0 ? _c : this.drawOptimization;
        this._enableSettling = !!params.enableSettling;
        if (this._enableSettling) {
            settlingEnabledInstanceCount++;
        }
        this.enableRiveAssetCDN =
            params.enableRiveAssetCDN === undefined
                ? true
                : params.enableRiveAssetCDN;
        this.deferDecoding = !!params.deferDecoding;
        this.enablePerfMarks = !!params.enablePerfMarks;
        if (this.enablePerfMarks)
            _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.enablePerfMarks = true;
        this._focusOptions = (_d = params.focusOptions) !== null && _d !== void 0 ? _d : this._focusOptions;
        this._tabIndex = (_e = params.tabIndex) !== null && _e !== void 0 ? _e : null;
        this.deferredRenderer = !!params.enableGPUCanvas;
        this.useReplayWorker = (_f = params.useReplayWorker) !== null && _f !== void 0 ? _f : true;
        this._inkbleedCapable = !!params.enableInkbleed;
        this._inkbleed = this._inkbleedCapable;
        // New event management system
        this.eventManager = new EventManager();
        if (params.onLoad)
            this.on(EventType.Load, params.onLoad);
        if (params.onLoadError)
            this.on(EventType.LoadError, params.onLoadError);
        if (params.onPlay)
            this.on(EventType.Play, params.onPlay);
        if (params.onPause)
            this.on(EventType.Pause, params.onPause);
        if (params.onStop)
            this.on(EventType.Stop, params.onStop);
        if (params.onLoop)
            this.on(EventType.Loop, params.onLoop);
        if (params.onStateChange)
            this.on(EventType.StateChange, params.onStateChange);
        if (params.onAdvance)
            this.on(EventType.Advance, params.onAdvance);
        /**
         * @deprecated Use camelCase'd versions instead.
         */
        if (params.onload && !params.onLoad)
            this.on(EventType.Load, params.onload);
        if (params.onloaderror && !params.onLoadError)
            this.on(EventType.LoadError, params.onloaderror);
        if (params.onplay && !params.onPlay)
            this.on(EventType.Play, params.onplay);
        if (params.onpause && !params.onPause)
            this.on(EventType.Pause, params.onpause);
        if (params.onstop && !params.onStop)
            this.on(EventType.Stop, params.onstop);
        if (params.onloop && !params.onLoop)
            this.on(EventType.Loop, params.onloop);
        if (params.onstatechange && !params.onStateChange)
            this.on(EventType.StateChange, params.onstatechange);
        /**
         * Asset loading
         */
        if (params.assetLoader)
            this.assetLoader = params.assetLoader;
        // Hook up the task queue
        this.taskQueue = new TaskQueueManager(this.eventManager);
        this.init({
            src: this.src,
            buffer: this.buffer,
            riveFile: this.riveFile,
            autoplay: params.autoplay,
            autoBind: params.autoBind,
            stateMachine: params.stateMachine,
            animations: params.animations,
            stateMachines: params.stateMachines,
            artboard: params.artboard,
            useOffscreenRenderer: params.useOffscreenRenderer,
            tabIndex: params.tabIndex,
            semanticsMode: params.semanticsMode,
            semanticsOptions: params.semanticsOptions,
            enableGPUCanvas: this.deferredRenderer,
        });
    }
    Object.defineProperty(Rive, "suppressDeprecationWarnings", {
        /**
         * Deprecation warnings to silence, by {@link DeprecationId}. Each warning
         * prints the id needed to silence it, so you can copy it out of the console.
         *
         * ```ts
         * Rive.suppressDeprecationWarnings = ["rive-events", "text-runs"];
         * ```
         *
         * Assigning replaces the whole list.
         * There is no option to silence everything
         */
        get: function () {
            return Object.freeze(Array.from(suppressedDeprecations));
        },
        set: function (ids) {
            setSuppressedDeprecations(ids);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "viewModelCount", {
        get: function () {
            return this.file.viewModelCount();
        },
        enumerable: false,
        configurable: true
    });
    // Alternative constructor to build a Rive instance from an interface/object
    Rive.new = function (params) {
        warnOnce(DeprecationKeys.legacyConstructors, "This function is deprecated: please use `new Rive({})` instead");
        return new Rive(params);
    };
    /**
     * @experimental Turns on semantics and the accessibility overlay for this
     * instance. Idempotent; safe to call before or after load. Use this to drive
     * a consumer-controlled accessibility toggle when constructed with the
     * default {@link SemanticMode.Disabled}.
     */
    Rive.prototype.enableSemantics = function () {
        this.wake();
        this.semanticsMode = _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode.Enabled;
        this.activateSemantics();
    };
    Rive.prototype.activateSemantics = function () {
        if (this._semanticsActive || this.semanticsMode === _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode.Disabled) {
            return;
        }
        this._semanticsActive = true;
        this.syncSemanticsOnStateMachines();
    };
    Rive.prototype.syncSemanticsOnStateMachines = function () {
        if (!this._semanticsActive || !this.animator) {
            return;
        }
        for (var _i = 0, _a = this.animator.stateMachines; _i < _a.length; _i++) {
            var stateMachine = _a[_i];
            stateMachine.enableSemantics();
        }
    };
    /**
     * Tears down the semantic tree and accessibility overlay. The overlay captures the
     * active state machine in its action closures, so it must not outlive the
     * instances it points at (reset/load delete them)
     */
    Rive.prototype.cleanupSemantics = function () {
        this._semanticTree = null;
        if (this._accessibilityOverlay) {
            this._accessibilityOverlay.destroy();
            this._accessibilityOverlay = null;
        }
    };
    // Event handler for when audio context becomes available
    Rive.prototype.onSystemAudioChanged = function () {
        this.volume = this._volume;
    };
    // Initializes the Rive object either from constructor or load()
    Rive.prototype.init = function (_a) {
        var _this = this;
        var _b, _c, _d, _e, _f;
        var src = _a.src, buffer = _a.buffer, riveFile = _a.riveFile, stateMachine = _a.stateMachine, animations = _a.animations, stateMachines = _a.stateMachines, artboard = _a.artboard, _g = _a.autoplay, autoplay = _g === void 0 ? false : _g, _h = _a.useOffscreenRenderer, useOffscreenRenderer = _h === void 0 ? false : _h, _j = _a.autoBind, autoBind = _j === void 0 ? false : _j, tabIndex = _a.tabIndex, semanticsMode = _a.semanticsMode, semanticsOptions = _a.semanticsOptions, enableGPUCanvas = _a.enableGPUCanvas;
        if (this.destroyed) {
            return;
        }
        // Validated before any state changes, so a call with no source leaves a
        // running instance untouched.
        if (!src && !buffer && !riveFile) {
            throw new RiveError(Rive.missingErrorMessage);
        }
        // Reload releases the outgoing file in the same order cleanup() uses:
        // artboard, then the renderer's session, then the file. The artboard goes
        // first because it holds an rcp<File> and its resources came from the
        // session about to be released. stop() has already deleted the animation
        // and state machine instances; reload deliberately skips cleanupInstances(),
        // which would also drop the event listeners load() keeps in place.
        if (this.artboard) {
            // Free GPU-backed resources with their own context current. No-op on
            // the canvas2d build.
            (_c = (_b = this.renderer) === null || _b === void 0 ? void 0 : _b.bindContext) === null || _c === void 0 ? void 0 : _c.call(_b);
            (_d = this.animator) === null || _d === void 0 ? void 0 : _d.stop();
            this.artboard.delete();
            this.artboard = null;
        }
        // Detach before the session is deleted: the handle dies with it.
        if (this.renderer) {
            (_f = (_e = this.renderer).detachSession) === null || _f === void 0 ? void 0 : _f.call(_e);
        }
        this.releaseCurrentRiveFile(/* isTeardown */ false);
        this.src = src;
        this.buffer = buffer;
        this.riveFile = riveFile;
        // initData flips this if it ends up importing the file itself.
        this.ownsRiveFile = false;
        // Sticky across reloads so a constructor-set flag survives; an explicit
        // `false` still turns it off.
        this.deferredRenderer = enableGPUCanvas !== null && enableGPUCanvas !== void 0 ? enableGPUCanvas : this.deferredRenderer;
        this._tabIndex = tabIndex !== null && tabIndex !== void 0 ? tabIndex : null;
        this.semanticsMode = semanticsMode !== null && semanticsMode !== void 0 ? semanticsMode : _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode.Disabled;
        this.semanticsOptions = semanticsOptions !== null && semanticsOptions !== void 0 ? semanticsOptions : this.semanticsOptions;
        // Names of the animations and state machines that should be initialized
        var _k = resolveStartingPlayback({
            stateMachine: stateMachine,
            animations: animations,
            stateMachines: stateMachines,
        }), startingAnimationNames = _k.startingAnimationNames, startingStateMachineNames = _k.startingStateMachineNames;
        // Ensure loaded is marked as false if loading new file
        this.loaded = false;
        this.readyForPlaying = false;
        this.lastRenderTime = 0;
        // Ensure the runtime is loaded
        _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.awaitInstance()
            .then(function (runtime) {
            var _a, _b;
            if (_this.destroyed) {
                return;
            }
            _this.runtime = runtime;
            runtime.onAssetChange = Rive.wakeSettledInstances;
            _this.removeRiveListeners();
            // load() reinitializes without cleanupInstances(); drop any stale overlay
            // bound to the previous file's state machines (no-op on first construct).
            _this.cleanupSemantics();
            _this.deleteRiveRenderer();
            // Get the canvas where you want to render the animation and create a renderer
            if (_this.enablePerfMarks)
                performance.mark('rive:make-renderer:start');
            try {
                // Always immediate at creation; a deferred file attaches its session
                // to this renderer once the file has loaded.
                _this.renderer = _this.runtime.makeRenderer(_this.canvas, useOffscreenRenderer, {
                    inkbleed: _this._inkbleedCapable,
                    // An immediate file would only re-import for the worker.
                    replayWorker: _this.deferredRenderer &&
                        _this.useReplayWorker &&
                        ((_b = (_a = _this.riveFile) === null || _a === void 0 ? void 0 : _a.deferredRequested) !== null && _b !== void 0 ? _b : true),
                    // Draws notice a restored context, so one has to be scheduled.
                    onContextRestored: function () {
                        _this.removeFromSettledInstances();
                        if (!_this._explicitlyStoppedRendering) {
                            _this.scheduleRendering();
                        }
                    },
                });
                if (!_this.renderer) {
                    throw new Error("Renderer is null, cannot render Rive on the canvas.");
                }
            }
            catch (e) {
                console.error(e);
                throw new RiveError("Unable to create the renderer, your environment may not support WebGL. Try the @rive-app/canvas runtime as an alternative.");
            }
            if (_this._inkbleedCapable) {
                _this.applyInkbleed();
            }
            if (_this.enablePerfMarks) {
                performance.mark('rive:make-renderer:end');
                performance.measure('rive:make-renderer', 'rive:make-renderer:start', 'rive:make-renderer:end');
            }
            // Initial size adjustment based on devicePixelRatio if no width/height are
            // specified explicitly
            if (!(_this.canvas.width || _this.canvas.height)) {
                _this.resizeDrawingSurfaceToCanvas();
            }
            // Load Rive data from a source uri or a data buffer
            _this.initData(artboard, startingAnimationNames, startingStateMachineNames, autoplay, autoBind)
                .then(function (hasInitialized) {
                if (hasInitialized) {
                    return _this.setupRiveListeners();
                }
            })
                .catch(function (e) {
                // initData already catches RiveErrors for load issues like artboard/state machine initialization
                // failures, so just console error and catch here so we don't double-fire the LoadError event
                console.error(e);
            });
        })
            .catch(function (e) {
            _this.eventManager.fire({ type: EventType.LoadError, data: e.message });
        });
    };
    /**
     * Setup Rive Listeners on the canvas
     * @param riveListenerOptions - Enables TouchEvent events on the canvas. Set to true to allow
     * touch scrolling on the canvas element on touch-enabled devices
     * i.e. { isTouchScrollEnabled: true }
     */
    Rive.prototype.setupRiveListeners = function (riveListenerOptions) {
        var _this = this;
        if (this.eventCleanup) {
            this.eventCleanup();
        }
        this.cleanupKeyboardInteractions();
        if (!this.shouldDisableRiveListeners) {
            var playingStateMachines = this.animator.stateMachines.filter(function (sm) { return sm.playing; });
            var activeStateMachines = playingStateMachines
                .filter(function (sm) { return _this.runtime.hasListeners(sm.instance); })
                .map(function (sm) { return sm.instance; });
            var touchScrollEnabledOption = this.isTouchScrollEnabled;
            var dispatchPointerExit = this.dispatchPointerExit;
            var enableMultiTouch = this.enableMultiTouch;
            if (riveListenerOptions &&
                "isTouchScrollEnabled" in riveListenerOptions) {
                touchScrollEnabledOption = riveListenerOptions.isTouchScrollEnabled;
            }
            this.eventCleanup = (0,_utils__WEBPACK_IMPORTED_MODULE_3__.registerTouchInteractions)({
                canvas: this.canvas,
                artboard: this.artboard,
                stateMachines: activeStateMachines,
                renderer: this.renderer,
                rive: this.runtime,
                fit: this._layout.runtimeFit(this.runtime),
                alignment: this._layout.runtimeAlignment(this.runtime),
                isTouchScrollEnabled: touchScrollEnabledOption,
                dispatchPointerExit: dispatchPointerExit,
                enableMultiTouch: enableMultiTouch,
                layoutScaleFactor: this._layout.layoutScaleFactor,
                advanceAndDrain: this.advanceAndDrainForPointer.bind(this),
                wake: this.wake.bind(this),
                summonKeyboard: this.summonKeyboardForGesture.bind(this),
                isTextProxyFocused: this.isEditingHostFocused,
            });
            this.ensureKeyboardInteractions();
            this.ensureGamepadInteractions();
        }
    };
    Object.defineProperty(Rive.prototype, "focusStateMachine", {
        // Assumes a single state machine drives focus.
        get: function () {
            return this.animator.stateMachines.find(function (sm) { return sm.playing && sm.hasFocusNodes; });
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Wire keyboard interactions when a playing state machine has focus nodes.
     * Called at listener setup and lazily each frame so late-bound bindable artboards work.
     */
    Rive.prototype.ensureKeyboardInteractions = function () {
        var _this = this;
        if (this._keyboardInteractions ||
            this.shouldDisableRiveListeners ||
            typeof window === "undefined" ||
            !(this.canvas instanceof HTMLCanvasElement)) {
            return;
        }
        var smWithFocusNodes = this.focusStateMachine;
        if (!smWithFocusNodes) {
            return;
        }
        var currentCanvasTabIndex = this.canvas.tabIndex;
        if (currentCanvasTabIndex === -1 || isNaN(currentCanvasTabIndex)) {
            this.canvas.tabIndex = (this._tabIndex !== null ? this._tabIndex : 0);
        }
        this._keyboardInteractions = new _utils__WEBPACK_IMPORTED_MODULE_3__.KeyboardInteractions({
            canvas: this.canvas,
            stateMachine: smWithFocusNodes.instance,
            hasFocusNodes: true,
            getOverlayElement: function () { var _a, _b; return (_b = (_a = _this._accessibilityOverlay) === null || _a === void 0 ? void 0 : _a.getSemanticOverlayContainer()) !== null && _b !== void 0 ? _b : null; },
            onInput: function () { return _this.wake(); },
        });
    };
    /** Runs inside touchend/mouseup so focusing the proxy raises the mobile keyboard. */
    Rive.prototype.summonKeyboardForGesture = function () {
        if (!this._keyboardInteractions)
            return;
        var activeSm = this.focusStateMachine;
        if (!activeSm)
            return;
        if (this.wantsTextInputSession(activeSm.focusState().expectsTextInput)) {
            this._keyboardInteractions.summonForPointer();
        }
    };
    /** expectsTextInput (not key listeners alone), and with semantics on a textField. */
    Rive.prototype.wantsTextInputSession = function (expectsTextInput) {
        var _a;
        if (!expectsTextInput)
            return false;
        var node = (_a = this._semanticTree) === null || _a === void 0 ? void 0 : _a.focusedNode();
        return node === undefined || node.role === _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticRole.textField;
    };
    Rive.prototype.advanceAndDrainForPointer = function (elapsedTime, options) {
        this.wake();
        if (!(options === null || options === void 0 ? void 0 : options.pointerDown)) {
            this.advanceAndReportChanges(elapsedTime);
            return;
        }
        this._inPointerDownDrain = true;
        try {
            this.advanceAndReportChanges(elapsedTime);
        }
        finally {
            this._inPointerDownDrain = false;
        }
    };
    Rive.prototype.cleanupKeyboardInteractions = function () {
        var _a;
        if (this._keyboardInteractions) {
            this._keyboardInteractions.cleanup();
            this._keyboardInteractions = null;
        }
        this._prevWantsTextInputSession = false;
        (_a = this._accessibilityOverlay) === null || _a === void 0 ? void 0 : _a.releaseEditingHost(null, null);
    };
    // Survives play/pause/stop so the state machine only receives missed changes on resume.
    Rive.prototype.ensureGamepadInteractions = function () {
        var _this = this;
        if (this._gamepadInteractions ||
            this.shouldDisableGamepad ||
            this.shouldDisableRiveListeners) {
            return;
        }
        this._gamepadInteractions = new _utils__WEBPACK_IMPORTED_MODULE_3__.GamepadInteractions({
            requireFocus: !!this._gamepadOptions.requireFocus,
            isFocusWithin: this.isFocusWithinCanvas,
            onPadConnected: function () { return _this.wake(); },
        });
    };
    Rive.prototype.cleanupGamepadInteractions = function () {
        var _a;
        (_a = this._gamepadInteractions) === null || _a === void 0 ? void 0 : _a.dispose();
        this._gamepadInteractions = null;
    };
    /**
     * Remove Rive Listeners setup on the canvas
     */
    Rive.prototype.removeRiveListeners = function () {
        if (this.eventCleanup) {
            this.eventCleanup();
            this.eventCleanup = null;
        }
        this.cleanupKeyboardInteractions();
    };
    /**
     * If the instance has audio and the system audio is not ready
     * we hook the instance to the audio manager
     */
    Rive.prototype.initializeAudio = function () {
        var _this = this;
        var _a;
        // Initialize audio if needed
        if (audioManager.status == SystemAudioStatus.UNAVAILABLE) {
            if (this.file.hasAudio ||
                (((_a = this.artboard) === null || _a === void 0 ? void 0 : _a.hasAudio) && this._audioEventListener === null)) {
                this._audioEventListener = {
                    type: EventType.AudioStatusChange,
                    callback: function () { return _this.onSystemAudioChanged(); },
                };
                audioManager.add(this._audioEventListener);
                audioManager.establishAudio();
            }
        }
    };
    Rive.prototype.initArtboardSize = function () {
        if (!this.artboard)
            return;
        // Use preset values if they are not undefined
        this._artboardWidth = this.artboard.width =
            this._artboardWidth || this.artboard.width;
        this._artboardHeight = this.artboard.height =
            this._artboardHeight || this.artboard.height;
    };
    // Initializes runtime with Rive data and preps for playing.
    // Returns true for successful initialization.
    Rive.prototype.initData = function (artboardName, animationNames, stateMachineNames, autoplay, autoBind) {
        return __awaiter(this, void 0, void 0, function () {
            var riveFile, error_4, msg;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 8, , 9]);
                        // A caller-supplied riveFile is theirs to release; one we import here is
                        // ours, which matters if a deferred fallback replaces it below.
                        this.ownsRiveFile = this.riveFile == null;
                        if (!this.ownsRiveFile) return [3 /*break*/, 2];
                        riveFile = new RiveFile({
                            src: this.src,
                            buffer: this.buffer,
                            enableRiveAssetCDN: this.enableRiveAssetCDN,
                            deferDecoding: this.deferDecoding,
                            assetLoader: this.assetLoader,
                            enablePerfMarks: this.enablePerfMarks,
                            // The instance owns this file, so its flag is the file's flag.
                            enableGPUCanvas: this.deferredRenderer,
                        });
                        this.riveFile = riveFile;
                        return [4 /*yield*/, riveFile.init()];
                    case 1:
                        _g.sent();
                        if (this.destroyed) {
                            // In the very unlikely scenario where the rive file created by this Rive is shared by
                            // another rive file, we only want to destroy it if this file is the only owner.
                            riveFile.destroyIfUnused();
                            return [2 /*return*/, false];
                        }
                        _g.label = 2;
                    case 2:
                        if (!(this.riveFile.deferredSession !== null ||
                            this.deferredRenderer ||
                            ((_b = (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.replaysOnWorker) === null || _b === void 0 ? void 0 : _b.call(_a)) === true)) return [3 /*break*/, 7];
                        if (!(((_d = (_c = this.renderer) === null || _c === void 0 ? void 0 : _c.replaysOnWorker) === null || _d === void 0 ? void 0 : _d.call(_c)) === true)) return [3 /*break*/, 4];
                        return [4 /*yield*/, _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.awaitReplayCaps()];
                    case 3:
                        _g.sent();
                        _g.label = 4;
                    case 4:
                        if (!!this.destroyed) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.resolveDeferredRendering()];
                    case 5:
                        _g.sent();
                        _g.label = 6;
                    case 6:
                        if (this.destroyed) {
                            // cleanup() ran during a re-import. Taking a reference now would
                            // resurrect a file this instance is never going to draw. Only ours
                            // to release — a caller-supplied file stays theirs.
                            if (this.ownsRiveFile) {
                                (_e = this.riveFile) === null || _e === void 0 ? void 0 : _e.destroyIfUnused();
                            }
                            return [2 /*return*/, false];
                        }
                        _g.label = 7;
                    case 7:
                        this.file = this.riveFile.getInstance();
                        this.reportDisplayScale();
                        // Initialize and draw frame
                        this.initArtboard(artboardName, animationNames, stateMachineNames, autoplay, autoBind);
                        // Initialize the artboard size
                        this.initArtboardSize();
                        // Check for audio
                        this.initializeAudio();
                        if (this.semanticsMode === _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticMode.Enabled) {
                            this.activateSemantics();
                        }
                        else if (this._semanticsActive) {
                            this.syncSemanticsOnStateMachines();
                        }
                        // Everything's set up, emit a load event
                        try {
                            this.loaded = true;
                            this.eventManager.fire({
                                type: EventType.Load,
                                data: (_f = this.src) !== null && _f !== void 0 ? _f : "buffer",
                            });
                        }
                        catch (e) {
                            // If any synchronous errors surface from the user-supplied onLoad callback,
                            // this will console.error the error but will not invoke LoadError (onLoadError).
                            // Notably, this will not interfere with Rive rendering
                            console.error(e);
                        }
                        // Only initialize paused state machines after the load event has been fired
                        // to allow users to initialize inputs and view models before the first advance
                        this.animator.advanceIfPaused();
                        // Flag ready for playback commands and clear the task queue; this order
                        // is important or it may infinitely recurse
                        this.readyForPlaying = true;
                        this.taskQueue.process();
                        this.drawFrame();
                        return [2 /*return*/, true];
                    case 8:
                        error_4 = _g.sent();
                        msg = resolveErrorMessage(error_4);
                        this.eventManager.fire({ type: EventType.LoadError, data: msg });
                        return [2 /*return*/, Promise.reject(msg)];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Settles which rendering mode this Rive instance runs in. The file dictates: its rendering mode
     * is fixed at import, and an immediate renderer silently drops a deferred
     * file's resources. Every mismatch warns and degrades to something that
     * renders, so users shouldn't have a blank canvas. A fallback self-reimport replaces `this.riveFile`;
     * only a file this instance imported is released when that happens.
     */
    Rive.prototype.resolveDeferredRendering = function () {
        return __awaiter(this, void 0, void 0, function () {
            var file, ownsFile, renderer, session, deferredOnly, attached_1, attachSession, immediate, _a, copy, attached, fallback;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        file = this.riveFile;
                        ownsFile = this.ownsRiveFile;
                        renderer = this.renderer;
                        session = file.deferredSession;
                        deferredOnly = ((_b = renderer === null || renderer === void 0 ? void 0 : renderer.replaysOnWorker) === null || _b === void 0 ? void 0 : _b.call(renderer)) === true;
                        if (!(session === null)) return [3 /*break*/, 3];
                        if (!deferredOnly) return [3 /*break*/, 2];
                        console.warn("Rive: this canvas draws on the replay worker, which only replays GPU Canvas files. Re-importing the file with `enableGPUCanvas: true` for this instance.");
                        return [4 /*yield*/, this.attachDeferredCopy(file, renderer)];
                    case 1:
                        attached_1 = (_d.sent()).attached;
                        if (attached_1 && ownsFile) {
                            file.destroyIfUnused();
                        }
                        return [2 /*return*/];
                    case 2:
                        // No second warning when the file asked for deferred and the build
                        // could not honor it; the unsupported-build warning already fired, and
                        // telling the user to set a flag they set would mislead.
                        if (this.deferredRenderer && !file.deferredRequested) {
                            console.warn("Rive: `enableGPUCanvas: true` was ignored because this RiveFile was imported without it. The mode is fixed at import: construct the RiveFile with `enableGPUCanvas: true` to opt in.");
                        }
                        return [2 /*return*/];
                    case 3:
                        if (!this.deferredRenderer) {
                            console.warn("Rive: this RiveFile was imported with `enableGPUCanvas: true`, so this instance renders deferred even though `enableGPUCanvas` is false on the instance. An immediate renderer would drop the file's deferred resources and draw nothing.");
                        }
                        attachSession = renderer === null || renderer === void 0 ? void 0 : renderer.attachSession;
                        if (!(typeof attachSession !== "function")) return [3 /*break*/, 5];
                        // Offscreen renderers share one context across canvases, which a session
                        // cannot record for. An immediate copy of the file still renders.
                        console.warn("Rive: this renderer cannot replay a deferred session (`useOffscreenRenderer` is not supported with deferred rendering). Re-importing the file in immediate mode for this instance.");
                        return [4 /*yield*/, file.reimport(false)];
                    case 4:
                        immediate = _d.sent();
                        if (this.destroyed) {
                            // cleanup() ran while we were importing; nothing will use this copy.
                            immediate.destroyIfUnused();
                            return [2 /*return*/];
                        }
                        this.riveFile = immediate;
                        this.ownsRiveFile = true;
                        if (ownsFile) {
                            // Nothing else can reach the deferred import we just walked away from.
                            file.destroyIfUnused();
                        }
                        return [2 /*return*/];
                    case 5:
                        // Never re-offered once claimed, even if that renderer is gone: the
                        // resources the session's stream refers to died with it.
                        if (!file.sessionClaimed && attachSession.call(renderer, session)) {
                            file.claimSession();
                            return [2 /*return*/];
                        }
                        // Bound to another instance. Re-import from the retained buffer into a
                        // session of our own.
                        file.warnBoundElsewhereOnce();
                        return [4 /*yield*/, this.attachDeferredCopy(file, renderer)];
                    case 6:
                        _a = _d.sent(), copy = _a.copy, attached = _a.attached;
                        if (attached || this.destroyed) {
                            return [2 /*return*/];
                        }
                        if (deferredOnly) {
                            console.warn("Rive: could not attach the re-imported file's deferred session to this canvas, which draws on the replay worker and has no immediate fallback.");
                            return [2 /*return*/];
                        }
                        // The copy's session could not take this canvas either (this renderer
                        // already holds one). An immediate re-import still renders; a deferred file
                        // on an immediate renderer would drop its resources and draw nothing.
                        console.warn("Rive: could not attach the re-imported file's deferred session to this canvas; falling back to immediate rendering for this instance.");
                        // If a leftover session is why the attach failed, it would keep routing
                        // the immediate file's draws into its recorder, which drops them.
                        (_c = renderer.detachSession) === null || _c === void 0 ? void 0 : _c.call(renderer);
                        return [4 /*yield*/, file.reimport(false)];
                    case 7:
                        fallback = _d.sent();
                        // The deferred copy was only ever ours, so it always goes.
                        copy.destroyIfUnused();
                        if (this.destroyed) {
                            fallback.destroyIfUnused();
                            return [2 /*return*/];
                        }
                        this.riveFile = fallback;
                        this.ownsRiveFile = true;
                        if (ownsFile) {
                            file.destroyIfUnused();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // Reloads what this instance was playing. State the reload does not carry,
    // such as a view model instance bound by hand, starts over.
    Rive.prototype.reloadForRestoredContext = function () {
        // A copy re-imported for this instance kept no source to reload from.
        var riveFile = this.ownsRiveFile ? undefined : this.riveFile;
        if (!this.src && !this.buffer && !riveFile) {
            this.stopRendering();
            if (!Rive.replayContextLostWarned) {
                Rive.replayContextLostWarned = true;
                console.warn("Rive: the replay worker's WebGL context was restored, but this instance has no `src` or `buffer` to reload from, so its canvas stays blank.");
            }
            return;
        }
        this.load({
            src: this.src,
            buffer: this.buffer,
            riveFile: riveFile,
            artboard: this.activeArtboard,
            animations: this.playingAnimationNames.concat(this.pausedAnimationNames),
            stateMachines: this.playingStateMachineNames.concat(this.pausedStateMachineNames),
            autoplay: this.isPlaying,
            autoBind: this._viewModelInstance !== null,
            enableGPUCanvas: this.deferredRenderer,
        });
    };
    /**
     * Re-imports `file` deferred and attaches the copy's session to `renderer`.
     * The copy becomes this instance's file either way, unless the instance was
     * destroyed while it imported.
     */
    Rive.prototype.attachDeferredCopy = function (file, renderer) {
        return __awaiter(this, void 0, void 0, function () {
            var copy, copySession, attached;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, file.reimport(true)];
                    case 1:
                        copy = _b.sent();
                        if (this.destroyed) {
                            // The renderer was deleted while we imported; attaching to it would hand
                            // embind a deleted object.
                            copy.destroyIfUnused();
                            return [2 /*return*/, { copy: copy, attached: false }];
                        }
                        this.riveFile = copy;
                        this.ownsRiveFile = true;
                        copySession = copy.deferredSession;
                        attached = copySession !== null && ((_a = renderer.attachSession) === null || _a === void 0 ? void 0 : _a.call(renderer, copySession)) === true;
                        if (attached) {
                            copy.claimSession();
                        }
                        return [2 /*return*/, { copy: copy, attached: attached }];
                }
            });
        });
    };
    // Initialize for playback
    Rive.prototype.initArtboard = function (artboardName, animationNames, stateMachineNames, autoplay, autoBind) {
        var _this = this;
        if (!this.file) {
            return;
        }
        // Fetch the artboard
        var rootArtboard = artboardName
            ? this.file.artboardByName(artboardName)
            : this.file.defaultArtboard();
        // Check we have a working artboard
        if (!rootArtboard) {
            throw new RiveError("Invalid artboard name or no default artboard");
        }
        this.artboard = rootArtboard;
        rootArtboard.volume = this._volume * audioManager.systemVolume;
        // A new artboard has to be drawn, so a settled loop restarts.
        this.wake();
        // Initialize the animator
        this.animator = new Animator(this.runtime, this.artboard, this.eventManager);
        this.animator.onInputChange = function () { return _this.wake(); };
        // Initialize the animations; as loaded hasn't happened yet, we need to
        // suppress firing the play/pause events until the load event has fired. To
        // do this we tell the animator to suppress firing events, and add event
        // firing to the task queue.
        var instanceNames;
        if (animationNames.length > 0 || stateMachineNames.length > 0) {
            instanceNames = animationNames.concat(stateMachineNames);
            this.animator.initLinearAnimations(animationNames, autoplay);
            this.animator.initStateMachines(stateMachineNames, autoplay, this._semanticsActive);
        }
        else {
            instanceNames = [this.animator.atLeastOne(autoplay, false, this._semanticsActive)];
        }
        // Queue up firing the playback events
        this.taskQueue.add({
            event: {
                type: autoplay ? EventType.Play : EventType.Pause,
                data: instanceNames,
            },
        });
        if (autoBind) {
            // Set the main view model instance (if the artboard has one)...
            var viewModel = this.file.defaultArtboardViewModel(rootArtboard);
            if (viewModel !== null) {
                var runtimeInstance = viewModel.defaultInstance();
                if (runtimeInstance !== null) {
                    var viewModelInstance = new ViewModelInstance(runtimeInstance, null);
                    (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, viewModelInstance.runtimeInstance);
                    this.setViewModelInstance(viewModelInstance);
                }
            }
            // ...and a default instance for each global view model (no longer
            // auto-created by the runtime), then apply everything in one rebind.
            for (var _i = 0, _a = this.file.globalViewModelNames(); _i < _a.length; _i++) {
                var name_1 = _a[_i];
                var globalViewModel = this.file.viewModelByName(name_1);
                if (globalViewModel !== null) {
                    var instance = new ViewModel(globalViewModel).defaultInstance();
                    if (instance !== null) {
                        this.setGlobalViewModelInstance(name_1, instance);
                    }
                }
            }
            this.bind();
        }
    };
    // Draws the current artboard frame
    Rive.prototype.drawFrame = function () {
        var _a, _b;
        // A settled instance resumes its loop from this frame, and a frame that
        // called this from a callback doesn't settle.
        this.removeFromSettledInstances();
        this._wakeGeneration++;
        if ((_a = document === null || document === void 0 ? void 0 : document.timeline) === null || _a === void 0 ? void 0 : _a.currentTime) {
            if (this.loaded && this.artboard && !this.frameRequestId) {
                this.draw(null);
                (_b = this.runtime) === null || _b === void 0 ? void 0 : _b.resolveAnimationFrame();
            }
        }
        else {
            this.scheduleRendering();
        }
    };
    Rive.prototype._canvasSizeChanged = function () {
        var changed = false;
        if (this.canvas) {
            if (this.canvas.width !== this._currentCanvasWidth) {
                this._currentCanvasWidth = this.canvas.width;
                changed = true;
            }
            if (this.canvas.height !== this._currentCanvasHeight) {
                this._currentCanvasHeight = this.canvas.height;
                changed = true;
            }
        }
        return changed;
    };
    // Content the artboard's change flag cannot see: ore and GPU canvas commands
    // scripts record straight into the session. Must be read before the renderer
    // clears — clearing marks the stream, so a later read is true every frame.
    Rive.prototype._deferredWorkPending = function () {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.deferredSession) === null || _b === void 0 ? void 0 : _b.recordedThisFrame()) !== null && _c !== void 0 ? _c : false;
    };
    /** Rive can move focus on its own, so reconcile the text session and DOM focus each frame. */
    Rive.prototype.pollFocusState = function () {
        this.ensureKeyboardInteractions();
        var ki = this._keyboardInteractions;
        var activeSm = ki ? this.focusStateMachine : undefined;
        if (!ki || !activeSm || !(this.canvas instanceof HTMLCanvasElement)) {
            this._prevHasFocus = false;
            this._prevWantsTextInputSession = false;
            return;
        }
        var _a = activeSm.focusState(), hasFocus = _a.hasFocus, expectsTextInput = _a.expectsTextInput;
        this.syncTextInputSession(ki, this.wantsTextInputSession(expectsTextInput));
        this.syncRiveFocus(ki, this.canvas, hasFocus);
    };
    /** Begin/end the text session on wantsSession edges; decorate the proxy while it has DOM focus. */
    Rive.prototype.syncTextInputSession = function (ki, wantsSession) {
        var host = ki.editingHost;
        var overlay = this._accessibilityOverlay;
        if (wantsSession) {
            var began = !this._prevWantsTextInputSession;
            if (began) {
                // In-domain or opted-in only; during pointer-down, pointer-up focuses instead.
                var focusProxy = !this._inPointerDownDrain &&
                    (ki.isInFocusDomain(document.activeElement) ||
                        !!this._focusOptions.allowFocusInterrupt);
                ki.beginTextInputSession(focusProxy);
            }
            // The <input> proxy stands in for the semantic DOM field only while it holds DOM focus.
            if (overlay && this._semanticTree) {
                if (host.hasDomFocus()) {
                    overlay.syncEditingHost(this._semanticTree, host, began || !overlay.hasEditingHost());
                }
                else if (overlay.hasEditingHost()) {
                    overlay.releaseEditingHost(this._semanticTree, host);
                }
            }
        }
        else if (this._prevWantsTextInputSession) {
            // Overlay hand-off first, ahead of endTextInputSession's park-on-canvas fallback.
            overlay === null || overlay === void 0 ? void 0 : overlay.releaseEditingHost(this._semanticTree, host);
            ki.endTextInputSession();
        }
        this._prevWantsTextInputSession = wantsSession;
    };
    /** Mirror Rive's hasFocus into the keyboard session state and, on opt-in, canvas focus. */
    Rive.prototype.syncRiveFocus = function (ki, canvas, hasFocus) {
        if (hasFocus) {
            ki.notifyRiveFocused();
            // Pull focus from outside Rive only with allowFocusInterrupt.
            if (!this._prevHasFocus) {
                if (!ki.isInFocusDomain(document.activeElement) &&
                    this._focusOptions.allowFocusInterrupt) {
                    canvas.focus();
                }
                this._prevHasFocus = true;
            }
        }
        else {
            this._prevHasFocus = false;
            // Rive released focus internally (e.g. a state change): drop the Tab trap so the next
            // Tab leaves the canvas.
            if (ki.focusSessionState === _utils__WEBPACK_IMPORTED_MODULE_3__.FocusSessionState.RiveFocused) {
                ki.setFocusSessionState(_utils__WEBPACK_IMPORTED_MODULE_3__.FocusSessionState.NotFocused);
            }
        }
    };
    /**
     * Handles important sequence of reporting Rive events, advancing the state machine or animation, and invoking various callbacks
     * due to state changes, view model property changes, etc.
     *
     * @param elapsedTime time to advance the state machine by
     * @param frameTime the rAF timestamp; omitted by pointer drains, which skip gamepad polling.
     * @returns false when only state machines are playing and none has anything left to animate
     */
    Rive.prototype.advanceAndReportChanges = function (elapsedTime, frameTime) {
        var _a, _b, _c, _d;
        // - Advance non-paused animations by the elapsed number of seconds
        // - Advance any animations that require scrubbing
        // - Advance to the first frame even when autoplay is false
        var activeAnimations = this.animator.animations
            .filter(function (a) { return a.playing || a.needsScrub; })
            // The scrubbed animations must be applied first to prevent weird artifacts
            // if the playing animations conflict with the scrubbed animating attribuates.
            .sort(function (first) { return (first.needsScrub ? -1 : 1); });
        for (var _i = 0, activeAnimations_1 = activeAnimations; _i < activeAnimations_1.length; _i++) {
            var animation = activeAnimations_1[_i];
            animation.advance(elapsedTime);
            if (animation.instance.didLoop) {
                animation.loopCount += 1;
            }
            animation.apply(1.0);
        }
        // - Advance non-paused state machines by the elapsed number of seconds
        // - Advance to the first frame even when autoplay is false
        var activeStateMachines = this.animator.stateMachines.filter(function (a) { return a.playing; });
        var needsAdvance = activeAnimations.length > 0 || activeStateMachines.length === 0;
        // Gamepad input lands before this frame's advance.
        // Also, frameTime is not passed for other places this function is called (i.e. after pointer events)
        if (frameTime !== undefined) {
            (_a = this._gamepadInteractions) === null || _a === void 0 ? void 0 : _a.handleGamepadInputs(frameTime, (_b = this.gamepadStateMachine) === null || _b === void 0 ? void 0 : _b.instance);
        }
        // Instrument the first 3 frames so the Performance timeline shows precise
        // per-call latency for advance, draw, and flush without polluting the trace.
        var _perfFrame = this.enablePerfMarks && this.frameCount < 3 ? this.frameCount : -1;
        for (var _e = 0, activeStateMachines_1 = activeStateMachines; _e < activeStateMachines_1.length; _e++) {
            var stateMachine = activeStateMachines_1[_e];
            // Check for events before the current frame's state machine advance
            var numEventsReported = stateMachine.reportedEventCount();
            if (numEventsReported) {
                for (var i = 0; i < numEventsReported; i++) {
                    var event_1 = stateMachine.reportedEventAt(i);
                    if (event_1) {
                        if (event_1.type === RiveEventType.OpenUrl) {
                            this.eventManager.fire({
                                type: EventType.RiveEvent,
                                data: event_1,
                            });
                            // Handle the event side effect if explicitly enabled
                            if (this.automaticallyHandleEvents) {
                                var newAnchorTag = document.createElement("a");
                                var _f = event_1, url = _f.url, target = _f.target;
                                var sanitizedUrl = (0,_utils__WEBPACK_IMPORTED_MODULE_3__.sanitizeUrl)(url);
                                url && newAnchorTag.setAttribute("href", sanitizedUrl);
                                target && newAnchorTag.setAttribute("target", target);
                                if (sanitizedUrl && sanitizedUrl !== _utils__WEBPACK_IMPORTED_MODULE_3__.BLANK_URL) {
                                    newAnchorTag.click();
                                }
                            }
                        }
                        else {
                            this.eventManager.fire({
                                type: EventType.RiveEvent,
                                data: event_1,
                            });
                        }
                    }
                }
            }
            if (_perfFrame >= 0)
                performance.mark("rive:sm-advance:start:f".concat(_perfFrame));
            if (stateMachine.advanceAndApply(elapsedTime) !== false) {
                needsAdvance = true;
            }
            if (_perfFrame >= 0) {
                performance.mark("rive:sm-advance:end:f".concat(_perfFrame));
                performance.measure("rive:sm-advance:f".concat(_perfFrame), "rive:sm-advance:start:f".concat(_perfFrame), "rive:sm-advance:end:f".concat(_perfFrame));
            }
            if (this._semanticsActive) {
                var diff = stateMachine.drainSemanticsDiff();
                if (diff) {
                    if (!this._semanticTree) {
                        this._semanticTree = new _semantics__WEBPACK_IMPORTED_MODULE_2__.SemanticTreeModel();
                    }
                    this._semanticTree.applyDiff(diff);
                }
            }
        }
        // Update the accessibility overlay after all state machines have
        // been advanced and their diffs applied to the tree model.
        if (this._semanticsActive &&
            this._semanticTree &&
            activeStateMachines.length > 0 &&
            this.canvas instanceof HTMLCanvasElement) {
            if (!this._accessibilityOverlay) {
                var mainSm_1 = activeStateMachines[0];
                this._accessibilityOverlay = new _semantics__WEBPACK_IMPORTED_MODULE_2__.AccessibilityOverlay({
                    canvas: this.canvas,
                    instanceId: this._instanceId,
                    semanticsOptions: this.semanticsOptions,
                    allowFocusInterrupt: this._focusOptions.allowFocusInterrupt,
                    isEditingHostFocused: this.isEditingHostFocused,
                    fireAction: function (nodeId, actionType) {
                        mainSm_1.fireSemanticAction(nodeId, actionType);
                    },
                    requestFocus: function (nodeId) {
                        return mainSm_1.focusSemanticNode(nodeId);
                    },
                    clearFocus: function () {
                        return mainSm_1.clearFocus();
                    },
                });
            }
            var overlayChange = (_c = this._accessibilityOverlay) === null || _c === void 0 ? void 0 : _c.needsUpdate(this._semanticTree);
            if (overlayChange || this._overlayTransformDirty) {
                // Only recompute the artboard→canvas transform when something that
                // affects it changed (canvas geometry or a layout/dpr input). When only
                // the semantic tree changed we pass null and reuse the existing CSS
                // transform on the overlay container.
                var forwardMat = null;
                if ((overlayChange === null || overlayChange === void 0 ? void 0 : overlayChange.layoutChanged) || this._overlayTransformDirty) {
                    var fit_1 = this._layout.runtimeFit(this.runtime);
                    var alignment = this._layout.runtimeAlignment(this.runtime);
                    forwardMat = this.runtime.computeAlignment(fit_1, alignment, {
                        minX: this._layout.minX,
                        minY: this._layout.minY,
                        maxX: this._layout.maxX,
                        maxY: this._layout.maxY,
                    }, this.artboard.bounds, this._devicePixelRatioUsed * this._layout.layoutScaleFactor);
                    this._overlayTransformDirty = false;
                }
                this._accessibilityOverlay.update(this._semanticTree, forwardMat, this._devicePixelRatioUsed, this.artboard.bounds, overlayChange);
                forwardMat === null || forwardMat === void 0 ? void 0 : forwardMat.delete();
            }
        }
        // For linear animations that have been applied to the artboard, advance it
        // by the elapsed time.
        if (this.animator.stateMachines.length == 0) {
            this.artboard.advance(elapsedTime);
        }
        // Check for any animations that looped
        this.animator.handleLooping();
        // Check for any state machines that had a state change
        this.animator.handleStateChanges();
        // Report advanced time
        this.animator.handleAdvancing(elapsedTime);
        // Poll focus state to see whether or not to blur or pull up a virtual keyboard for any change to a text input node.
        this.pollFocusState();
        // Reattaches after reset(), which doesn't rerun setupRiveListeners. Runs after the
        // advance so a new state machine has its initial focus before input arrives.
        this.ensureGamepadInteractions();
        // Handle callbacks for main view model property changes
        (_d = this._viewModelInstance) === null || _d === void 0 ? void 0 : _d.handleCallbacks();
        // Handle callbacks for global view model property changes
        this._globalViewModelInstances.forEach(function (instance) {
            if (instance) {
                instance.handleCallbacks();
            }
        });
        return needsAdvance;
    };
    /**
     * Draw rendering loop; renders animation frames at the correct time interval.
     * @param time the rAF timestamp, or null to draw now without advancing
     */
    Rive.prototype.draw = function (time, onSecond) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Clear the frameRequestId, as we're now rendering a fresh frame
        this.frameRequestId = null;
        // load() tears the artboard down and re-inits asynchronously; a frame
        // queued before that lands here with nothing to draw.
        if (!this.artboard) {
            return;
        }
        // While settled, a timed frame only polls gamepads; pad input or an
        // out-of-frame draw wakes.
        if (this.isInSettledInstances) {
            var padInput = time !== null &&
                !!((_a = this._gamepadInteractions) === null || _a === void 0 ? void 0 : _a.handleGamepadInputs(time, (_b = this.gamepadStateMachine) === null || _b === void 0 ? void 0 : _b.instance));
            if (time !== null && !padInput) {
                if (this.needsNextFrame) {
                    this.scheduleRendering();
                }
                return;
            }
            this.removeFromSettledInstances();
        }
        // The replay worker's context came back empty, so everything it held has
        // to be recorded again through a fresh renderer and session.
        if (((_d = (_c = this.renderer) === null || _c === void 0 ? void 0 : _c.contextRestored) === null || _d === void 0 ? void 0 : _d.call(_c)) === true) {
            this.reloadForRestoredContext();
            return;
        }
        // The replay worker has yet to take the canvas, is still on earlier
        // frames, or is slower than the display and this frame falls between its
        // paced ones. Waiting keeps its queue bounded, and the frame that follows
        // advances by the whole wait, so playback keeps time.
        var accepts = ((_f = (_e = this.renderer) === null || _e === void 0 ? void 0 : _e.acceptsFrame) === null || _f === void 0 ? void 0 : _f.call(_e)) !== false;
        var replayMs = (_h = (_g = this.renderer) === null || _g === void 0 ? void 0 : _g.replayMs) === null || _h === void 0 ? void 0 : _h.call(_g);
        if (time !== null && replayMs !== undefined
            ? !this.replayPacer.shouldRecord(time, replayMs, accepts)
            : !accepts) {
            this.scheduleRendering();
            return;
        }
        var before = performance.now();
        // Instrument the first 3 frames so the Performance timeline shows precise
        // per-call latency for advance, draw, and flush without polluting the trace.
        var _perfFrame = this.enablePerfMarks && this.frameCount < 3 ? this.frameCount : -1;
        var batch = Rive.batchStart;
        if (time !== null && batch.time !== time) {
            batch.time = time;
            batch.now = before;
        }
        // A frame queued during a long task is stamped inside it: start at now.
        if (!this.lastRenderTime && time !== null) {
            this.lastRenderTime = Math.max(time, batch.now);
        }
        else if (time !== null && time < this.lastRenderTime) {
            // The now-seed can lead the next stamp by a vsync; restart, don't freeze.
            this.lastRenderTime = time;
        }
        // Out-of-frame draws keep the clock: timeline time is frozen per task.
        var frameTime = time === null ? this.lastRenderTime : Math.max(time, this.lastRenderTime);
        // Handle the onSecond callback
        this.renderSecondTimer += frameTime - this.lastRenderTime;
        if (this.renderSecondTimer > 5000) {
            this.renderSecondTimer = 0;
            onSecond === null || onSecond === void 0 ? void 0 : onSecond();
        }
        // Calculate the elapsed time between frames in seconds
        var elapsedTime = (frameTime - this.lastRenderTime) / 1000;
        this.lastRenderTime = frameTime;
        var wakeGenerationAtFrameStart = this._wakeGeneration;
        var assetGenerationAtFrameStart = assetGeneration;
        var needsAdvance = this.advanceAndReportChanges(elapsedTime, time);
        var renderer = this.renderer;
        // Don't draw on a 0-size canvas; redraw once it has area. The observer
        // flags zero size late, so also check the surface itself.
        var hasSurface = this.canvas.width > 0 && this.canvas.height > 0;
        // A 0-second advance always reports work, so only a timed frame can settle.
        // A frame that can't draw, or that saw a wake during its callbacks, keeps going.
        // Deferred work must be read before the renderer clears below.
        var settles = this._enableSettling &&
            time !== null &&
            elapsedTime > 0 &&
            hasSurface &&
            !needsAdvance &&
            this._wakeGeneration === wakeGenerationAtFrameStart &&
            assetGeneration === assetGenerationAtFrameStart &&
            !this._deferredWorkPending();
        if (!hasSurface) {
            this._needsRedraw = true;
        }
        if (!this._hasZeroSize && hasSurface) {
            // If there was no dirt on this frame, do not clear and draw. The deferred
            // term has to be read here, before `clear()` below: clearing opens the
            // session's recording window and marks its stream, so a read taken after
            // it reports every frame as dirty and nothing is ever skipped.
            if (this.drawOptimization == DrawOptimizationOptions.AlwaysDraw ||
                this.artboard.didChange() ||
                this._deferredWorkPending() ||
                this._needsRedraw ||
                this._canvasSizeChanged()) {
                // Canvas must be wiped to prevent artifacts
                renderer.clear();
                renderer.save();
                // Update the renderer alignment if necessary
                if (_perfFrame >= 0)
                    performance.mark("rive:align-renderer:start:f".concat(_perfFrame));
                this.alignRenderer();
                if (_perfFrame >= 0) {
                    performance.mark("rive:align-renderer:end:f".concat(_perfFrame));
                    performance.measure("rive:align-renderer:f".concat(_perfFrame), "rive:align-renderer:start:f".concat(_perfFrame), "rive:align-renderer:end:f".concat(_perfFrame));
                }
                if (_perfFrame >= 0)
                    performance.mark("rive:artboard-draw:start:f".concat(_perfFrame));
                this.artboard.draw(renderer);
                if (_perfFrame >= 0) {
                    performance.mark("rive:artboard-draw:end:f".concat(_perfFrame));
                    performance.measure("rive:artboard-draw:f".concat(_perfFrame), "rive:artboard-draw:start:f".concat(_perfFrame), "rive:artboard-draw:end:f".concat(_perfFrame));
                }
                renderer.restore();
                if (_perfFrame >= 0)
                    performance.mark("rive:renderer-flush:start:f".concat(_perfFrame));
                renderer.flush();
                if (_perfFrame >= 0) {
                    performance.mark("rive:renderer-flush:end:f".concat(_perfFrame));
                    performance.measure("rive:renderer-flush:f".concat(_perfFrame), "rive:renderer-flush:start:f".concat(_perfFrame), "rive:renderer-flush:end:f".concat(_perfFrame));
                }
                this._needsRedraw = false;
            }
        }
        // Add duration to create frame to durations array
        this.frameCount++;
        var after = performance.now();
        this.frameTimes.push(after);
        this.durations.push(after - before);
        while (this.frameTimes[0] <= after - 1000) {
            this.frameTimes.shift();
            this.durations.shift();
        }
        // Calling requestAnimationFrame will rerun draw() at the correct rate:
        // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
        if (this.animator.isPlaying) {
            if (settles) {
                this.addToSettledInstances();
                // A wake restarts from elapsedTime 0 instead of the time spent settled.
                this.lastRenderTime = 0;
            }
            if (this.needsNextFrame) {
                // Request a new rendering frame
                this.scheduleRendering();
            }
        }
        else if (this.animator.isPaused) {
            // Reset the end time so on playback it starts at the correct frame
            this.lastRenderTime = 0;
        }
        else if (this.animator.isStopped) {
            // Reset animation instances, artboard and time
            // TODO: implement this properly when we have instancing
            // this.initArtboard();
            // this.drawFrame();
            this.lastRenderTime = 0;
        }
    };
    /**
     * Align the renderer
     */
    Rive.prototype.alignRenderer = function () {
        var _a = this, renderer = _a.renderer, runtime = _a.runtime, _layout = _a._layout, artboard = _a.artboard;
        // Align things up safe in the knowledge we can restore if changed
        renderer.align(_layout.runtimeFit(runtime), _layout.runtimeAlignment(runtime), {
            minX: _layout.minX,
            minY: _layout.minY,
            maxX: _layout.maxX,
            maxY: _layout.maxY,
        }, artboard.bounds, this._devicePixelRatioUsed * _layout.layoutScaleFactor);
    };
    Object.defineProperty(Rive.prototype, "fps", {
        get: function () {
            return this.durations.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "frameTime", {
        get: function () {
            if (this.durations.length === 0) {
                return 0;
            }
            return (this.durations.reduce(function (a, b) { return a + b; }, 0) / this.durations.length).toFixed(4);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Cleans up all Wasm-generated objects that need to be manually destroyed:
     * artboard instances, animation instances, state machine instances,
     * renderer instance, file and runtime.
     *
     * Once this is called, you will need to initialise a new instance of the
     * Rive class
     */
    Rive.prototype.cleanup = function () {
        var _this = this;
        var _a, _b, _c, _d;
        if (this._enableSettling && !this.destroyed) {
            settlingEnabledInstanceCount--;
        }
        this.destroyed = true;
        this.removeFromSettledInstances();
        // Stop the renderer if it hasn't already been stopped.
        this.stopRendering();
        // Make the GL context backing this renderer current before any WASM teardown
        // that frees GPU resources. Binding here covers the artboard/file deletes;
        // deleteRiveRenderer() re-binds for the renderer's own delete. No-op on the
        // canvas2d build
        (_b = (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.bindContext) === null || _b === void 0 ? void 0 : _b.call(_a);
        // Clean up any artboard, animation or state machine instances.
        this.cleanupInstances();
        // Remove from observer
        if (this._observed !== null) {
            observers.remove(this._observed);
        }
        this.removeRiveListeners();
        // The file and its session go before the renderer: the session's replay
        // state lives in the renderer's context. But the renderer must let go of
        // the session first — its detach handle dies with session.delete(), and a
        // later detach would pass embind a deleted object.
        if (this.renderer) {
            (_d = (_c = this.renderer).detachSession) === null || _d === void 0 ? void 0 : _d.call(_c);
        }
        this.releaseCurrentRiveFile(/* isTeardown */ true);
        this.riveFile = null;
        this.deleteRiveRenderer();
        if (this._audioEventListener !== null) {
            audioManager.remove(this._audioEventListener);
            this._audioEventListener = null;
        }
        if (this._pageVisibilityHandler) {
            document.removeEventListener('visibilitychange', this._pageVisibilityHandler);
            this._pageVisibilityHandler = null;
        }
        this.releaseViewModelInstance(this._viewModelInstance);
        this._viewModelInstance = null;
        this._globalViewModelInstances.forEach(function (instance) {
            return _this.releaseViewModelInstance(instance);
        });
        this._globalViewModelInstances.clear();
        this._dataEnums = null;
    };
    /**
     * Drops this instance's hold on `this.riveFile`. A reference taken through
     * getInstance() is given back; a file we imported but never referenced is
     * released outright so its session goes with it. A caller-supplied file we
     * never referenced is left alone.
     *
     * `isTeardown` distinguishes cleanup() from a reload. Teardown always hands
     * the reference back, as it always has. A reload must not do that for a
     * caller-supplied file: a RiveFile carries no reference for its creator, so
     * releasing here would take the last one and destroy a file the caller still
     * holds.
     */
    Rive.prototype.releaseCurrentRiveFile = function (isTeardown) {
        var _a, _b;
        if (this.file) {
            if (isTeardown || this.ownsRiveFile) {
                (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.cleanup();
            }
            this.file = null;
        }
        else if (this.ownsRiveFile) {
            (_b = this.riveFile) === null || _b === void 0 ? void 0 : _b.destroyIfUnused();
        }
    };
    /**
     * Cleans up the Renderer object. Only call this API if you no longer
     * need to render Rive content in your session.
     */
    Rive.prototype.deleteRiveRenderer = function () {
        var _a, _b;
        if (this.renderer) {
            // A session outliving this renderer has to stop pointing at it, and its
            // replay state has to drop while this context is still alive. No-op when
            // nothing was ever attached.
            (_b = (_a = this.renderer).detachSession) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.renderer.delete();
        }
        this.renderer = null;
    };
    Object.defineProperty(Rive.prototype, "deferredRendererActive", {
        /**
         * @experimental This API is early and may encounter breaking behavior change without a major version bump
         *
         * Whether this instance is rendering through a deferred session. False whenever
         * a fallback ran, whatever was requested.
         */
        get: function () {
            var _a, _b, _c;
            return (_c = (_b = (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.deferredActive) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : false;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Cleans up any Wasm-generated objects that need to be manually destroyed:
     * artboard instances, animation instances, state machine instances.
     *
     * Once this is called, things will need to be reinitialized or bad things
     * might happen.
     */
    Rive.prototype.cleanupInstances = function () {
        var _a;
        if (this.eventCleanup !== null) {
            this.eventCleanup();
        }
        this.cleanupKeyboardInteractions();
        this.cleanupGamepadInteractions();
        // Tear down semantics before deleting state machines — the overlay's action
        // closures point at instances that stop() is about to free.
        this.cleanupSemantics();
        // Delete all animation and state machine instances synchronously via the
        // animator
        (_a = this.animator) === null || _a === void 0 ? void 0 : _a.stop();
        if (this.artboard) {
            this.artboard.delete();
            this.artboard = null;
        }
    };
    /**
     * Tries to query the setup Artboard for a text run node with the given name.
     *
     * @param textRunName - Name of the text run node associated with a text object
     * @returns - TextValueRun node or undefined if the text run cannot be queried
     */
    Rive.prototype.retrieveTextRun = function (textRunName) {
        var _a;
        if (!textRunName) {
            console.warn("No text run name provided");
            return;
        }
        if (!this.artboard) {
            console.warn("Tried to access text run, but the Artboard is null");
            return;
        }
        var textRun = this.artboard.textRun(textRunName);
        if (!textRun) {
            console.warn("Could not access a text run with name '".concat(textRunName, "' in the '").concat((_a = this.artboard) === null || _a === void 0 ? void 0 : _a.name, "' Artboard. Note that you must rename a text run node in the Rive editor to make it queryable at runtime."));
            return;
        }
        return textRun;
    };
    /**
     * Returns a string from a given text run node name, or undefined if the text run
     * cannot be queried.
     *
     * @deprecated Text run APIs are deprecated: use data binding instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#updating-text-runs-at-runtime}
     * for how to migrate.
     * @param textRunName - Name of the text run node associated with a text object
     * @returns - String value of the text run node or undefined
     */
    Rive.prototype.getTextRunValue = function (textRunName) {
        warnOnce(DeprecationKeys.textRuns, textRunsDeprecationWarning);
        var textRun = this.retrieveTextRun(textRunName);
        return textRun ? textRun.text : undefined;
    };
    /**
     * Sets a text value for a given text run node name if possible
     *
     * @deprecated Text run APIs are deprecated: use data binding instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#updating-text-runs-at-runtime}
     * for how to migrate.
     * @param textRunName - Name of the text run node associated with a text object
     * @param textRunValue - String value to set on the text run node
     */
    Rive.prototype.setTextRunValue = function (textRunName, textRunValue) {
        this.wake();
        warnOnce(DeprecationKeys.textRuns, textRunsDeprecationWarning);
        var textRun = this.retrieveTextRun(textRunName);
        if (textRun) {
            textRun.text = textRunValue;
        }
    };
    /**
     * Warns when playback-control names match linear animations in the
     * Animator's instanced context; state machine playback remain supported.
     *
     * Remove for v3 release
     */
    Rive.prototype.warnIfLinearAnimationNames = function (names, methodName) {
        if (this.animator &&
            this.animator.animations.some(function (a) { return names.includes(a.name); })) {
            warnDeprecatedAnimationNames(methodName);
        }
    };
    /**
     * Plays specified animations or state machines; if none specified, it
     * unpauses everything.
     * @param animationNames Animation or state machine name(s) to play.
     *
     * Deprecated usage: passing linear animation names (control playback with a
     * state machine instead) and passing an array of names (this parameter
     * becomes a single string in the next major version).
     */
    Rive.prototype.play = function (animationNames, autoplay) {
        var _this = this;
        warnIfNamesArray(animationNames, "play");
        var names = mapToStringArray(animationNames);
        // If the file's not loaded, queue up the play
        if (!this.readyForPlaying) {
            this.taskQueue.add({
                action: function () { return _this.play(animationNames, autoplay); },
            });
            return;
        }
        this.animator.play(names);
        this.warnIfLinearAnimationNames(names, "play");
        this.syncSemanticsOnStateMachines();
        if (this.eventCleanup) {
            this.eventCleanup();
        }
        this.cleanupKeyboardInteractions();
        this.setupRiveListeners();
        this.startRendering();
    };
    /**
     * Pauses specified animations or state machines; if none specified, pauses
     * all.
     * @param animationNames Animation or state machine name(s) to pause.
     *
     * Deprecated usage: passing linear animation names (control playback with a
     * state machine instead) and passing an array of names (this parameter
     * becomes a single string in the next major version).
     */
    Rive.prototype.pause = function (animationNames) {
        var _this = this;
        warnIfNamesArray(animationNames, "pause");
        var names = mapToStringArray(animationNames);
        // If the file's not loaded, early out, nothing to pause
        if (!this.readyForPlaying) {
            this.taskQueue.add({
                action: function () { return _this.pause(animationNames); },
            });
            return;
        }
        if (this.eventCleanup) {
            this.eventCleanup();
        }
        this.cleanupKeyboardInteractions();
        this.animator.pause(names);
        this.removeFromSettledInstancesIfNotPlaying();
        this.warnIfLinearAnimationNames(names, "pause");
    };
    /**
     * Scrubs specified animations to the given time; if none specified, scrubs
     * all of them.
     * @deprecated `scrub()` will be removed in a future major version: use a
     * state machine to control playback instead
     */
    Rive.prototype.scrub = function (animationNames, value) {
        var _this = this;
        warnOnce(DeprecationKeys.scrub, "`scrub()` is deprecated and will be removed in a future major version: " +
            "use a state machine to control playback instead.");
        var names = mapToStringArray(animationNames);
        // If the file's not loaded, early out, nothing to pause
        if (!this.readyForPlaying) {
            this.taskQueue.add({
                action: function () { return _this.scrub(animationNames, value); },
            });
            return;
        }
        // Scrub the animation time; we draw a single frame here so that if
        // nothing's currently playing, the scrubbed animation is still rendered/
        this.animator.scrub(names, value || 0);
        this.drawFrame();
    };
    /**
     * Stops specified animations or state machines; if none specified, stops
     * them all.
     * @param animationNames Animation or state machine name(s) to stop.
     *
     * Deprecated usage: passing linear animation names (control playback with a
     * state machine instead) and passing an array of names (this parameter
     * becomes a single string in the next major version).
     */
    Rive.prototype.stop = function (animationNames) {
        var _this = this;
        warnIfNamesArray(animationNames, "stop");
        var names = mapToStringArray(animationNames);
        // If the file's not loaded, early out, nothing to pause
        if (!this.readyForPlaying) {
            this.taskQueue.add({
                action: function () { return _this.stop(animationNames); },
            });
            return;
        }
        this.warnIfLinearAnimationNames(names, "stop");
        // If there is no artboard, this.animator will be undefined
        if (this.animator) {
            this.animator.stop(names);
        }
        if (this.eventCleanup) {
            this.eventCleanup();
        }
        this.cleanupKeyboardInteractions();
        this.cleanupSemantics();
        this.removeFromSettledInstancesIfNotPlaying();
    };
    /**
     * Resets the animation
     * @param artboard the name of the artboard, or default if none given
     * @param stateMachine the name of the state machine for playback
     * @param autoplay whether to autoplay when reset, defaults to false
     *
     */
    Rive.prototype.reset = function (params) {
        var _a, _b;
        // Get the current artboard, animations, state machines, and playback states
        var artBoardName = params === null || params === void 0 ? void 0 : params.artboard;
        var _c = resolveStartingPlayback({
            stateMachine: params === null || params === void 0 ? void 0 : params.stateMachine,
            animations: params === null || params === void 0 ? void 0 : params.animations,
            stateMachines: params === null || params === void 0 ? void 0 : params.stateMachines,
        }), animationNames = _c.startingAnimationNames, stateMachineNames = _c.startingStateMachineNames;
        var autoplay = (_a = params === null || params === void 0 ? void 0 : params.autoplay) !== null && _a !== void 0 ? _a : false;
        var autoBind = (_b = params === null || params === void 0 ? void 0 : params.autoBind) !== null && _b !== void 0 ? _b : false;
        // Stop everything and clean up
        this.cleanupInstances();
        // Reinitialize an artboard instance with the state
        this.initArtboard(artBoardName, animationNames, stateMachineNames, autoplay, autoBind);
        // Only drain the task queue once playback commands can execute; tasks
        // queued before then re-add themselves in a loop.
        if (this.readyForPlaying) {
            this.taskQueue.process();
        }
    };
    // Loads a new Rive file, keeping listeners in place
    Rive.prototype.load = function (params) {
        // Before stop(), so a call with no source leaves playback running.
        if (!params.src && !params.buffer && !params.riveFile) {
            throw new RiveError(Rive.missingErrorMessage);
        }
        // Stop all animations
        this.stop();
        // Reinitialize
        this.init(params);
    };
    Object.defineProperty(Rive.prototype, "layout", {
        /**
         * Returns the current layout. Note that layout should be treated as
         * immutable. If you want to change the layout, create a new one use the
         * layout setter
         */
        get: function () {
            return this._layout;
        },
        // Sets a new layout
        set: function (layout) {
            this.wake();
            this._layout = layout;
            this.reportDisplayScale();
            // Fit/alignment/bounds feed the overlay transform.
            this._overlayTransformDirty = true;
            // If the maxX or maxY are 0, then set them to the canvas width and height
            if (!layout.maxX || !layout.maxY) {
                this.resizeToCanvas();
            }
            if (this.loaded && !this.animator.isPlaying) {
                this.drawFrame();
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Sets the layout bounds to the current canvas size; this is typically called
     * when the canvas is resized
     */
    Rive.prototype.resizeToCanvas = function () {
        this.wake();
        this._layout = this.layout.copyWith({
            minX: 0,
            minY: 0,
            maxX: this.canvas.width,
            maxY: this.canvas.height,
        });
        // Layout bounds feed the overlay transform.
        this._overlayTransformDirty = true;
    };
    /**
     * Accounts for devicePixelRatio as a multiplier to render the size of the canvas drawing surface.
     * Uses the size of the backing canvas to set new width/height attributes. Need to re-render
     * and resize the layout to match the new drawing surface afterwards.
     * Useful function for consumers to include in a window resize listener.
     *
     * This method will set the {@link devicePixelRatioUsed} property.
     *
     * Optionally, you can provide a {@link customDevicePixelRatio} to provide a
     * custom value.
     */
    Rive.prototype.resizeDrawingSurfaceToCanvas = function (customDevicePixelRatio) {
        if (this.canvas instanceof HTMLCanvasElement && !!window) {
            var _a = this.canvas.getBoundingClientRect(), width = _a.width, height = _a.height;
            var dpr = customDevicePixelRatio || window.devicePixelRatio || 1;
            this.devicePixelRatioUsed = dpr;
            this.canvas.width = dpr * width;
            this.canvas.height = dpr * height;
            this._needsRedraw = true;
            this.resizeToCanvas();
            if (this.layout.fit === Fit.Layout && this.artboard) {
                var scaleFactor = this._layout.layoutScaleFactor;
                this.artboard.width = width / scaleFactor;
                this.artboard.height = height / scaleFactor;
            }
            this.drawFrame();
        }
    };
    Object.defineProperty(Rive.prototype, "source", {
        // Returns the animation source, which may be undefined
        get: function () {
            return this.src;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "activeArtboard", {
        /**
         * Returns the name of the active artboard
         */
        get: function () {
            return this.artboard ? this.artboard.name : "";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "semanticTree", {
        /**
         * Returns the semantic tree model when semantics are enabled, or null.
         * The overlay and external consumers use this to inspect the
         * current state of the semantic tree.
         */
        get: function () {
            return this._semanticTree;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "accessibilityOverlay", {
        /**
         * Returns the accessibility overlay when semantics are enabled, or null.
         * External consumers can use this to inspect the
         * current state of the accessibility overlay for this instance.
         */
        get: function () {
            return this._accessibilityOverlay;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "animationNames", {
        // Returns a list of animation names on the chosen artboard
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded || !this.artboard) {
                return [];
            }
            var animationNames = [];
            for (var i = 0; i < this.artboard.animationCount(); i++) {
                animationNames.push(this.artboard.animationByIndex(i).name);
            }
            return animationNames;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "stateMachineNames", {
        /**
         * Returns a list of state machine names from the current artboard
         */
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded || !this.artboard) {
                return [];
            }
            var stateMachineNames = [];
            for (var i = 0; i < this.artboard.stateMachineCount(); i++) {
                stateMachineNames.push(this.artboard.stateMachineByIndex(i).name);
            }
            return stateMachineNames;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns the inputs for the specified instanced state machine, or an empty
     * list if the name is invalid or the state machine is not instanced. Returns
     * undefined if the file is not loaded yet.
     *
     * @deprecated State machine inputs are deprecated: use data binding
     * properties instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
     * for how to migrate.
     * @param name the state machine name
     * @returns the inputs for the named state machine or undefined
     */
    Rive.prototype.stateMachineInputs = function (name) {
        warnOnce(DeprecationKeys.stateMachineInputs, stateMachineInputsDeprecationWarning);
        // If the file's not loaded, early out, nothing to pause
        if (!this.loaded) {
            return;
        }
        var stateMachine = this.animator.stateMachines.find(function (m) { return m.name === name; });
        return stateMachine === null || stateMachine === void 0 ? void 0 : stateMachine.inputs;
    };
    // Returns the input with the provided name at the given path
    Rive.prototype.retrieveInputAtPath = function (name, path) {
        if (!name) {
            console.warn("No input name provided for path '".concat(path, "'"));
            return;
        }
        if (!this.artboard) {
            console.warn("Tried to access input: '".concat(name, "', at path: '").concat(path, "', but the Artboard is null"));
            return;
        }
        var input = this.artboard.inputByPath(name, path);
        if (!input) {
            console.warn("Could not access an input with name: '".concat(name, "', at path:'").concat(path, "'"));
            return;
        }
        return input;
    };
    /**
     * Set the boolean input with the provided name at the given path with value
     * @deprecated State machine inputs are deprecated: use data binding
     * properties instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
     * for how to migrate.
     * @param input the state machine input name
     * @param value the value to set the input to
     * @param path the path the input is located at an artboard level
     */
    Rive.prototype.setBooleanStateAtPath = function (inputName, value, path) {
        this.wake();
        warnOnce(DeprecationKeys.stateMachineInputs, stateMachineInputsDeprecationWarning);
        var input = this.retrieveInputAtPath(inputName, path);
        if (!input)
            return;
        if (input.type === StateMachineInputType.Boolean) {
            input.asBool().value = value;
        }
        else {
            console.warn("Input with name: '".concat(inputName, "', at path:'").concat(path, "' is not a boolean"));
        }
    };
    /**
     * Set the number input with the provided name at the given path with value
     * @deprecated State machine inputs are deprecated: use data binding
     * properties instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
     * for how to migrate.
     * @param input the state machine input name
     * @param value the value to set the input to
     * @param path the path the input is located at an artboard level
     */
    Rive.prototype.setNumberStateAtPath = function (inputName, value, path) {
        this.wake();
        warnOnce(DeprecationKeys.stateMachineInputs, stateMachineInputsDeprecationWarning);
        var input = this.retrieveInputAtPath(inputName, path);
        if (!input)
            return;
        if (input.type === StateMachineInputType.Number) {
            input.asNumber().value = value;
        }
        else {
            console.warn("Input with name: '".concat(inputName, "', at path:'").concat(path, "' is not a number"));
        }
    };
    /**
     * Fire the trigger with the provided name at the given path
     * @deprecated State machine inputs are deprecated: use data binding
     * properties instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#state-machine-inputs}
     * for how to migrate.
     * @param input the state machine input name
     * @param path the path the input is located at an artboard level
     */
    Rive.prototype.fireStateAtPath = function (inputName, path) {
        this.wake();
        warnOnce(DeprecationKeys.stateMachineInputs, stateMachineInputsDeprecationWarning);
        var input = this.retrieveInputAtPath(inputName, path);
        if (!input)
            return;
        if (input.type === StateMachineInputType.Trigger) {
            input.asTrigger().fire();
        }
        else {
            console.warn("Input with name: '".concat(inputName, "', at path:'").concat(path, "' is not a trigger"));
        }
    };
    // Returns the TextValueRun object for the provided name at the given path
    Rive.prototype.retrieveTextAtPath = function (name, path) {
        if (!name) {
            console.warn("No text name provided for path '".concat(path, "'"));
            return;
        }
        if (!path) {
            console.warn("No path provided for text '".concat(name, "'"));
            return;
        }
        if (!this.artboard) {
            console.warn("Tried to access text: '".concat(name, "', at path: '").concat(path, "', but the Artboard is null"));
            return;
        }
        var text = this.artboard.textByPath(name, path);
        if (!text) {
            console.warn("Could not access text with name: '".concat(name, "', at path:'").concat(path, "'"));
            return;
        }
        return text;
    };
    /**
     * Retrieves the text value for a specified text run at a given path
     * @param textName The name of the text run
     * @param path The path to the text run within the artboard
     * @returns The text value of the text run, or undefined if not found
     *
     * @example
     * // Get the text value for a text run named "title" at one nested artboard deep
     * const titleText = riveInstance.getTextRunValueAtPath("title", "artboard1");
     *
     * @example
     * // Get the text value for a text run named "subtitle" within a nested group two artboards deep
     * const subtitleText = riveInstance.getTextRunValueAtPath("subtitle", "group/nestedGroup");
     *
     * @remarks
     * If the text run cannot be found at the specified path, a warning will be logged to the console.
     *
     * @deprecated Text run APIs are deprecated: use data binding instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#updating-text-runs-at-runtime}
     * for how to migrate.
     */
    Rive.prototype.getTextRunValueAtPath = function (textName, path) {
        warnOnce(DeprecationKeys.textRuns, textRunsDeprecationWarning);
        var run = this.retrieveTextAtPath(textName, path);
        if (!run) {
            console.warn("Could not get text with name: '".concat(textName, "', at path:'").concat(path, "'"));
            return;
        }
        return run.text;
    };
    /**
     * Sets the text value for a specified text run at a given path
     * @param textName The name of the text run
     * @param value The new text value to set
     * @param path The path to the text run within the artboard
     * @returns void
     *
     * @example
     * // Set the text value for a text run named "title" at one nested artboard deep
     * riveInstance.setTextRunValueAtPath("title", "New Title", "artboard1");
     *
     * @example
     * // Set the text value for a text run named "subtitle" within a nested group two artboards deep
     * riveInstance.setTextRunValueAtPath("subtitle", "New Subtitle", "group/nestedGroup");
     *
     * @remarks
     * If the text run cannot be found at the specified path, a warning will be logged to the console.
     *
     * @deprecated Text run APIs are deprecated: use data binding instead. See
     * {@link https://rive.app/docs/editor/data-binding/migration-guide#updating-text-runs-at-runtime}
     * for how to migrate.
     */
    Rive.prototype.setTextRunValueAtPath = function (textName, value, path) {
        this.wake();
        warnOnce(DeprecationKeys.textRuns, textRunsDeprecationWarning);
        var run = this.retrieveTextAtPath(textName, path);
        if (!run) {
            console.warn("Could not set text with name: '".concat(textName, "', at path:'").concat(path, "'"));
            return;
        }
        run.text = value;
    };
    Object.defineProperty(Rive.prototype, "playingStateMachineNames", {
        // Returns a list of playing machine names
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded) {
                return [];
            }
            return this.animator.stateMachines
                .filter(function (m) { return m.playing; })
                .map(function (m) { return m.name; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "playingAnimationNames", {
        // Returns a list of playing animation names
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded) {
                return [];
            }
            return this.animator.animations.filter(function (a) { return a.playing; }).map(function (a) { return a.name; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "pausedAnimationNames", {
        // Returns a list of paused animation names
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded) {
                return [];
            }
            return this.animator.animations
                .filter(function (a) { return !a.playing; })
                .map(function (a) { return a.name; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "pausedStateMachineNames", {
        /**
         *  Returns a list of paused machine names
         * @returns a list of state machine names that are paused
         */
        get: function () {
            // If the file's not loaded, we got nothing to return
            if (!this.loaded) {
                return [];
            }
            return this.animator.stateMachines
                .filter(function (m) { return !m.playing; })
                .map(function (m) { return m.name; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "isPlaying", {
        /**
         * @returns true if any animation is playing
         */
        get: function () {
            return this.animator.isPlaying;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "isPaused", {
        /**
         * @returns true if all instanced animations are paused
         */
        get: function () {
            return this.animator.isPaused;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "isStopped", {
        /**
         * @returns true if no animations are playing or paused
         */
        get: function () {
            var _a, _b;
            return (_b = (_a = this.animator) === null || _a === void 0 ? void 0 : _a.isStopped) !== null && _b !== void 0 ? _b : true;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "bounds", {
        /**
         * @returns the bounds of the current artboard, or undefined if the artboard
         * isn't loaded yet.
         */
        get: function () {
            return this.artboard ? this.artboard.bounds : undefined;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Subscribe to Rive-generated events
     *
     * Note: subscribing to {@link EventType.RiveEvent},
     * {@link EventType.StateChange}, or {@link EventType.Loop} is deprecated;
     * use data binding instead. See
     * {@link https://rive.app/docs/runtimes/web/rive-events} (Rive Events) and
     * {@link https://rive.app/docs/editor/data-binding/migration-guide} for how
     * to migrate Rive graphics to a data binding workflow instead.
     * @param type the type of event to subscribe to
     * @param callback callback to fire when the event occurs
     */
    Rive.prototype.on = function (type, callback) {
        if (type === EventType.RiveEvent) {
            warnOnce(DeprecationKeys.riveEvents, riveEventsDeprecationWarning);
        }
        else if (type === EventType.StateChange) {
            warnOnce(DeprecationKeys.stateChangeEvents, stateChangeEventsDeprecationWarning);
        }
        else if (type === EventType.Loop) {
            warnOnce(DeprecationKeys.loopEvents, loopEventsDeprecationWarning);
        }
        this.eventManager.add({
            type: type,
            callback: callback,
        });
    };
    /**
     * Unsubscribes from a Rive-generated event
     * @param type the type of event to unsubscribe from
     * @param callback the callback to unsubscribe
     */
    Rive.prototype.off = function (type, callback) {
        this.eventManager.remove({
            type: type,
            callback: callback,
        });
    };
    /**
     * Unsubscribes from a Rive-generated event
     * @deprecated
     * @param callback the callback to unsubscribe from
     */
    Rive.prototype.unsubscribe = function (type, callback) {
        warnOnce(DeprecationKeys.legacyUnsubscribe, "This function is deprecated: please use `off()` instead.");
        this.off(type, callback);
    };
    /**
     * Unsubscribes all Rive listeners from an event type, or everything if no type is
     * given
     * @param type the type of event to unsubscribe from, or all types if
     * undefined
     */
    Rive.prototype.removeAllRiveEventListeners = function (type) {
        this.eventManager.removeAll(type);
    };
    /**
     * Unsubscribes all listeners from an event type, or everything if no type is
     * given
     * @deprecated
     * @param type the type of event to unsubscribe from, or all types if
     * undefined
     */
    Rive.prototype.unsubscribeAll = function (type) {
        warnOnce(DeprecationKeys.legacyUnsubscribe, "This function is deprecated: please use `removeAllRiveEventListeners()` instead.");
        this.removeAllRiveEventListeners(type);
    };
    /**
     * Stops the rendering loop; this is different from pausing in that it doesn't
     * change the state of any animation. It stops rendering from occurring. This
     * is designed for situations such as when Rive isn't visible.
     *
     * The only way to start rendering again is to call `startRendering`.
     * Animations that are marked as playing will start from the position that
     * they would have been at if rendering had not been stopped.
     */
    Rive.prototype.stopRendering = function () {
        this._explicitlyStoppedRendering = true;
        if (this.loaded && this.frameRequestId) {
            if (this.runtime.cancelAnimationFrame) {
                this.runtime.cancelAnimationFrame(this.frameRequestId);
            }
            else {
                cancelAnimationFrame(this.frameRequestId);
            }
            this.frameRequestId = null;
        }
    };
    /**
     * Starts the rendering loop if it has been previously stopped. If the
     * renderer is already active, then this will have zero effect.
     */
    Rive.prototype.startRendering = function () {
        this._explicitlyStoppedRendering = false;
        this.drawFrame();
    };
    Object.defineProperty(Rive.prototype, "isSettled", {
        /**
         * True while `enableSettling` has stopped the render loop because every
         * playing state machine has nothing left to animate. Not set by `pause()`
         * or `stopRendering()`.
         */
        get: function () {
            var _a;
            return this.isInSettledInstances && !!((_a = this.animator) === null || _a === void 0 ? void 0 : _a.isPlaying);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "isInSettledInstances", {
        get: function () {
            return settledInstances.has(this);
        },
        enumerable: false,
        configurable: true
    });
    Rive.prototype.addToSettledInstances = function () {
        settledInstances.add(this);
    };
    Rive.prototype.removeFromSettledInstances = function () {
        settledInstances.delete(this);
    };
    // A paused or stopped loop isn't settled: wakes leave it alone until play()
    // starts rendering again, as they do when settling is off.
    Rive.prototype.removeFromSettledInstancesIfNotPlaying = function () {
        var _a;
        if (!((_a = this.animator) === null || _a === void 0 ? void 0 : _a.isPlaying)) {
            this.removeFromSettledInstances();
        }
    };
    Object.defineProperty(Rive.prototype, "needsNextFrame", {
        /** Whether the loop needs another frame: always, unless settled with no gamepad to poll. */
        get: function () {
            var _a, _b;
            return (!this.isInSettledInstances ||
                (!!((_a = this.animator) === null || _a === void 0 ? void 0 : _a.isPlaying) && !!((_b = this._gamepadInteractions) === null || _b === void 0 ? void 0 : _b.isPolling)));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "gamepadStateMachine", {
        /** The state machine that receives gamepad input. */
        get: function () {
            return this.animator.stateMachines.find(function (sm) { return sm.playing; });
        },
        enumerable: false,
        configurable: true
    });
    /** Records a change, and restarts the loop if it stopped because it settled. */
    Rive.prototype.wake = function () {
        this._wakeGeneration++;
        if (!this.isInSettledInstances) {
            return;
        }
        this.removeFromSettledInstances();
        if (!this._explicitlyStoppedRendering) {
            this.scheduleRendering();
        }
    };
    Rive.prototype.scheduleRendering = function () {
        var _a, _b;
        if (this.loaded && this.artboard && !this.frameRequestId) {
            if (this.runtime.requestAnimationFrame) {
                this.frameRequestId = this.runtime.requestAnimationFrame(this._boundDraw, ((_b = (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.replaysOnWorker) === null || _b === void 0 ? void 0 : _b.call(_a)) === true);
            }
            else {
                this.frameRequestId = requestAnimationFrame(this._boundDraw);
            }
        }
    };
    /**
     * Called when document.visibilitychange fires (tab change, window minimize, etc.).
     * Cancels the rAF loop on hide and resets the time reference so that no accumulated time is
     * applied to state machines when the tab becomes visible again. This prevents state machine
     * advances with large time deltas when rAF starts up again.
     */
    Rive.prototype._onPageVisibilityChange = function () {
        var _a, _b;
        if (document.hidden) {
            if (this.frameRequestId !== null) {
                if ((_a = this.runtime) === null || _a === void 0 ? void 0 : _a.cancelAnimationFrame) {
                    this.runtime.cancelAnimationFrame(this.frameRequestId);
                }
                else {
                    cancelAnimationFrame(this.frameRequestId);
                }
                this.frameRequestId = null;
            }
            // Reset so the first resumed frame starts with elapsedTime === 0.
            this.lastRenderTime = 0;
        }
        else if (((_b = this.animator) === null || _b === void 0 ? void 0 : _b.isPlaying) &&
            !this._explicitlyStoppedRendering &&
            this.needsNextFrame) {
            this.scheduleRendering();
        }
    };
    /**
     * Enables frames-per-second (FPS) reporting for the runtime
     * If no callback is provided, Rive will append a fixed-position div at the top-right corner of
     * the page with the FPS reading
     * @param fpsCallback - Callback from the runtime during the RAF loop that supplies the FPS value
     */
    Rive.prototype.enableFPSCounter = function (fpsCallback) {
        this.runtime.enableFPSCounter(fpsCallback);
    };
    /**
     * Disables frames-per-second (FPS) reporting for the runtime
     */
    Rive.prototype.disableFPSCounter = function () {
        this.runtime.disableFPSCounter();
    };
    Object.defineProperty(Rive.prototype, "contents", {
        /**
         * Returns the contents of a Rive file: the artboards, animations, and state machines
         */
        get: function () {
            if (!this.loaded) {
                return undefined;
            }
            var riveContents = {
                artboards: [],
            };
            for (var i = 0; i < this.file.artboardCount(); i++) {
                var artboard = this.file.artboardByIndex(i);
                var artboardContents = {
                    name: artboard.name,
                    animations: [],
                    stateMachines: [],
                };
                for (var j = 0; j < artboard.animationCount(); j++) {
                    var animation = artboard.animationByIndex(j);
                    artboardContents.animations.push(animation.name);
                }
                for (var k = 0; k < artboard.stateMachineCount(); k++) {
                    var stateMachine = artboard.stateMachineByIndex(k);
                    var name_2 = stateMachine.name;
                    var instance = new this.runtime.StateMachineInstance(stateMachine, artboard);
                    var inputContents = [];
                    for (var l = 0; l < instance.inputCount(); l++) {
                        var input = instance.input(l);
                        inputContents.push({ name: input.name, type: input.type });
                    }
                    artboardContents.stateMachines.push({
                        name: name_2,
                        inputs: inputContents,
                    });
                }
                riveContents.artboards.push(artboardContents);
            }
            return riveContents;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "volume", {
        /**
         * Getter / Setter for the volume of the artboard
         */
        get: function () {
            if (this.artboard && this.artboard.volume !== this._volume) {
                this._volume = this.artboard.volume;
            }
            return this._volume;
        },
        set: function (value) {
            this._volume = value;
            if (this.artboard) {
                this.artboard.volume = value * audioManager.systemVolume;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "artboardWidth", {
        /**
         * The width of the artboard.
         *
         * This will return 0 if the artboard is not loaded yet and a custom
         * width has not been set.
         *
         * Do not set this value manually when using {@link resizeDrawingSurfaceToCanvas}
         * with a {@link Layout.fit} of {@link Fit.Layout}, as the artboard width is
         * automatically set.
         */
        get: function () {
            var _a;
            if (this.artboard) {
                return this.artboard.width;
            }
            return (_a = this._artboardWidth) !== null && _a !== void 0 ? _a : 0;
        },
        set: function (value) {
            this.wake();
            this._artboardWidth = value;
            if (this.artboard) {
                this.artboard.width = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "artboardHeight", {
        /**
         * The height of the artboard.
         *
         * This will return 0 if the artboard is not loaded yet and a custom
         * height has not been set.
         *
         * Do not set this value manually when using {@link resizeDrawingSurfaceToCanvas}
         * with a {@link Layout.fit} of {@link Fit.Layout}, as the artboard height is
         * automatically set.
         */
        get: function () {
            var _a;
            if (this.artboard) {
                return this.artboard.height;
            }
            return (_a = this._artboardHeight) !== null && _a !== void 0 ? _a : 0;
        },
        set: function (value) {
            this.wake();
            this._artboardHeight = value;
            if (this.artboard) {
                this.artboard.height = value;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Reset the artboard size to its original values.
     */
    Rive.prototype.resetArtboardSize = function () {
        this.wake();
        if (this.artboard) {
            this.artboard.resetArtboardSize();
            this._artboardWidth = this.artboard.width;
            this._artboardHeight = this.artboard.height;
        }
        else {
            // If the artboard isn't loaded, we need to reset the custom width and height
            this._artboardWidth = undefined;
            this._artboardHeight = undefined;
        }
    };
    Object.defineProperty(Rive.prototype, "devicePixelRatioUsed", {
        /**
         * The device pixel ratio used in rendering and canvas/artboard resizing.
         *
         * This value will be overidden by the device pixel ratio used in
         * {@link resizeDrawingSurfaceToCanvas}. If you use that method, do not set this value.
         */
        get: function () {
            return this._devicePixelRatioUsed;
        },
        set: function (value) {
            this.wake();
            if (value !== this._devicePixelRatioUsed) {
                this._overlayTransformDirty = true;
            }
            this._devicePixelRatioUsed = value;
            this.reportDisplayScale();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rive.prototype, "inkbleed", {
        /**
         * @experimental (WebGL2 only) Whether inkbleed antialiasing is in effect. Can only be
         * turned on if `enableInkbleed: true` was passed at construction.
         */
        get: function () {
            return this._inkbleedCapable && this._inkbleed;
        },
        set: function (value) {
            if (!this._inkbleedCapable) {
                if (value && !Rive.inkbleedNotCapableWarned) {
                    Rive.inkbleedNotCapableWarned = true;
                    console.warn("Rive: `inkbleed` can't be enabled on this instance. It needs `enableInkbleed: true` at construction, on @rive-app/webgl2 without `useOffscreenRenderer`.");
                }
                return;
            }
            this._inkbleed = value;
            if (this.renderer) {
                this.applyInkbleed();
            }
            this._needsRedraw = true;
            this.drawFrame();
        },
        enumerable: false,
        configurable: true
    });
    Rive.prototype.applyInkbleed = function () {
        var enabled = this._inkbleed;
        var setInkbleed = this.renderer.setInkbleed;
        var supported = typeof setInkbleed === "function"
            ? setInkbleed.call(this.renderer, enabled)
            : !enabled;
        if (!supported) {
            this._inkbleedCapable = false;
            if (!Rive.inkbleedUnsupportedWarned) {
                Rive.inkbleedUnsupportedWarned = true;
                console.warn("Rive: `inkbleed` is not supported by this renderer (it needs @rive-app/webgl2 without `useOffscreenRenderer`, and a canvas context with depth and stencil). Rendering without it.");
            }
        }
    };
    // Not per frame: the scale is per file, and instances sharing one would trade
    // it every frame.
    Rive.prototype.reportDisplayScale = function () {
        var _a;
        (_a = this.file) === null || _a === void 0 ? void 0 : _a.displayScale(this._devicePixelRatioUsed * this._layout.layoutScaleFactor);
    };
    /**
     * Sets the main view model instance and applies it (rebinds). Equivalent to
     * `setViewModelInstance(vmi)` followed by `bind()`.
     */
    Rive.prototype.bindViewModelInstance = function (viewModelInstance) {
        this.wake();
        if (!viewModelInstance) {
            return;
        }
        this.setViewModelInstance(viewModelInstance);
        this.bind();
    };
    /**
     * Sets the main view model instance in the data context WITHOUT rebinding.
     * Call {@link bind} to apply. Use this with {@link setGlobalViewModelInstance}
     * to batch multiple changes into a single rebind.
     */
    Rive.prototype.setViewModelInstance = function (viewModelInstance) {
        this.wake();
        var runtimeInstance = viewModelInstance === null || viewModelInstance === void 0 ? void 0 : viewModelInstance.runtimeInstance;
        if (!this.artboard ||
            this.destroyed ||
            !viewModelInstance ||
            !runtimeInstance) {
            return;
        }
        this.holdViewModelInstance(viewModelInstance, this._viewModelInstance);
        this._viewModelInstance = viewModelInstance;
        if (this.animator.stateMachines.length > 0) {
            this.animator.stateMachines.forEach(function (stateMachine) {
                return stateMachine.instance.setViewModelInstance(runtimeInstance);
            });
        }
        else {
            this.artboard.setViewModelInstance(runtimeInstance);
        }
    };
    /** Takes a reference to `next` in place of `previous`; with settling on, writes to `next` wake this instance. */
    Rive.prototype.holdViewModelInstance = function (next, previous) {
        next.internalIncrementReferenceCount();
        this.releaseViewModelInstance(previous);
        if (this._enableSettling) {
            next.internalAddWakeCallback(this._wakeFromViewModel);
        }
    };
    Rive.prototype.releaseViewModelInstance = function (instance) {
        instance === null || instance === void 0 ? void 0 : instance.internalRemoveWakeCallback(this._wakeFromViewModel);
        instance === null || instance === void 0 ? void 0 : instance.cleanup();
    };
    /**
     * Applies any pending `set*` view model instance changes by rebinding the
     * data binds once.
     * Implicitly creates and binds any view models that have not been set.
     */
    Rive.prototype.bind = function () {
        this.wake();
        if (!this.artboard || this.destroyed) {
            return;
        }
        if (this.animator.stateMachines.length > 0) {
            this.animator.stateMachines.forEach(function (stateMachine) {
                return stateMachine.instance.bind();
            });
        }
        else {
            this.artboard.bind();
        }
    };
    Object.defineProperty(Rive.prototype, "viewModelInstance", {
        get: function () {
            return this._viewModelInstance;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Sets (or replaces) the global view model instance for the given global view
     * model name in the data context WITHOUT rebinding. The main instance and any
     * other globals keep their order. Call {@link bind} to apply — batch several
     * `set*` calls then a single `bind()` to avoid rebinding per set.
     * @param name - the name of the global view model
     * @param viewModelInstance - the instance to set for that global
     * @returns whether the instance was set (false if `name` does not match a
     * global view model in the file)
     */
    Rive.prototype.setGlobalViewModelInstance = function (name, viewModelInstance) {
        this.wake();
        var runtimeInstance = viewModelInstance === null || viewModelInstance === void 0 ? void 0 : viewModelInstance.runtimeInstance;
        if (!this.artboard || this.destroyed || !runtimeInstance) {
            return false;
        }
        var bound = false;
        if (this.animator.stateMachines.length > 0) {
            this.animator.stateMachines.forEach(function (stateMachine) {
                if (stateMachine.instance.setGlobalViewModelInstance(name, runtimeInstance)) {
                    bound = true;
                }
            });
        }
        else {
            bound = this.artboard.setGlobalViewModelInstance(name, runtimeInstance);
        }
        if (bound) {
            this.holdViewModelInstance(viewModelInstance, this._globalViewModelInstances.get(name));
            this._globalViewModelInstances.set(name, viewModelInstance);
        }
        return bound;
    };
    /**
     * @param name - the name of the global view model
     * @returns the global view model instance bound under the given name — the
     * instance set via {@link setGlobalViewModelInstance} or one created by
     * auto-bind — or null if none has been set/created for that name (globals are
     * not auto-created; the getter never creates one).
     */
    Rive.prototype.globalViewModelInstance = function (name) {
        var cached = this._globalViewModelInstances.get(name);
        if (cached) {
            return cached;
        }
        if (!this.artboard || this.destroyed) {
            return null;
        }
        // State machines share the artboard's data context; query the first one
        // when present (mirroring how the setter routes), otherwise the artboard.
        // This is a pure read — it returns null unless an instance was set/bound.
        var runtimeInstance = this.animator.stateMachines.length > 0
            ? this.animator.stateMachines[0].instance.globalViewModelInstance(name)
            : this.artboard.globalViewModelInstance(name);
        if (runtimeInstance === null) {
            return null;
        }
        var viewModelInstance = new ViewModelInstance(runtimeInstance, null);
        (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, runtimeInstance);
        this.holdViewModelInstance(viewModelInstance, undefined);
        this._globalViewModelInstances.set(name, viewModelInstance);
        return viewModelInstance;
    };
    /**
     * @returns the names of the file's global view models, in file order. Use
     * these with {@link setGlobalViewModelInstance} / {@link globalViewModelInstance}.
     */
    Rive.prototype.globalViewModelNames = function () {
        var _a, _b;
        return (_b = (_a = this.file) === null || _a === void 0 ? void 0 : _a.globalViewModelNames()) !== null && _b !== void 0 ? _b : [];
    };
    Rive.prototype.viewModelByIndex = function (index) {
        var viewModel = this.file.viewModelByIndex(index);
        if (viewModel !== null) {
            return new ViewModel(viewModel);
        }
        return null;
    };
    Rive.prototype.viewModelByName = function (name) {
        var _a;
        return (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.viewModelByName(name);
    };
    Rive.prototype.enums = function () {
        if (this._dataEnums === null) {
            var dataEnums = this.file.enums();
            this._dataEnums = dataEnums.map(function (dataEnum) {
                return new DataEnum(dataEnum);
            });
        }
        return this._dataEnums;
    };
    Rive.prototype.defaultViewModel = function () {
        if (this.artboard) {
            var viewModel = this.file.defaultArtboardViewModel(this.artboard);
            if (viewModel) {
                return new ViewModel(viewModel);
            }
        }
        return null;
    };
    /**
     * @deprecated This function is deprecated. For better stability and memory management
     * use `getBindableArtboard()` instead.
     * @param {string} name - The name of the artboard.
     * @returns {Artboard} The artboard to bind to.
     */
    Rive.prototype.getArtboard = function (name) {
        var _a, _b;
        return (_b = (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.getArtboard(name)) !== null && _b !== void 0 ? _b : null;
    };
    Rive.prototype.getBindableArtboard = function (name) {
        var _a, _b;
        return (_b = (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.getBindableArtboard(name)) !== null && _b !== void 0 ? _b : null;
    };
    Rive.prototype.getDefaultBindableArtboard = function () {
        var _a, _b;
        return (_b = (_a = this.riveFile) === null || _a === void 0 ? void 0 : _a.getDefaultBindableArtboard()) !== null && _b !== void 0 ? _b : null;
    };
    /**
     * Clear focus applicable to active state machines with focus nodes. Useful if users want to
     * reset focus state and behavior within the Rive graphic at any point (i.e. blurring off the canvas)
     */
    Rive.prototype.clearFocus = function () {
        var playingStateMachines = this.animator.stateMachines.filter(function (sm) { return sm.playing && sm.hasFocusNodes; });
        playingStateMachines.forEach(function (sm) { return sm.clearFocus(); });
    };
    Rive.inkbleedUnsupportedWarned = false;
    Rive.replayContextLostWarned = false;
    Rive.inkbleedNotCapableWarned = false;
    // Error message for missing source or buffer
    Rive.missingErrorMessage = "Rive source file or data buffer required";
    // Error message for removed rive file
    Rive.cleanupErrorMessage = "Attempt to use file after calling cleanup.";
    // Asset changes have no owning instance, so they wake every settled one;
    // a frame running now sees assetGeneration move.
    Rive.wakeSettledInstances = function () {
        assetGeneration++;
        // Waking removes the instance from the set.
        Array.from(settledInstances).forEach(function (rive) { return rive.wake(); });
    };
    // performance.now() at the current rAF batch's start; first frames seed from it.
    Rive.batchStart = { time: -1, now: 0 };
    return Rive;
}());

var DataType;
(function (DataType) {
    DataType["none"] = "none";
    DataType["string"] = "string";
    DataType["number"] = "number";
    DataType["boolean"] = "boolean";
    DataType["color"] = "color";
    DataType["list"] = "list";
    DataType["enumType"] = "enumType";
    DataType["trigger"] = "trigger";
    DataType["viewModel"] = "viewModel";
    DataType["integer"] = "integer";
    DataType["listIndex"] = "listIndex";
    DataType["image"] = "image";
    DataType["artboard"] = "artboard";
})(DataType || (DataType = {}));
var ViewModel = /** @class */ (function () {
    function ViewModel(viewModel) {
        this._viewModel = viewModel;
    }
    Object.defineProperty(ViewModel.prototype, "instanceCount", {
        get: function () {
            return this._viewModel.instanceCount;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "name", {
        get: function () {
            return this._viewModel.name;
        },
        enumerable: false,
        configurable: true
    });
    ViewModel.prototype.instanceByIndex = function (index) {
        var instance = this._viewModel.instanceByIndex(index);
        if (instance !== null) {
            var viewModelInstance = new ViewModelInstance(instance, null);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, instance);
            return viewModelInstance;
        }
        return null;
    };
    ViewModel.prototype.instanceByName = function (name) {
        var instance = this._viewModel.instanceByName(name);
        if (instance !== null) {
            var viewModelInstance = new ViewModelInstance(instance, null);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, instance);
            return viewModelInstance;
        }
        return null;
    };
    ViewModel.prototype.defaultInstance = function () {
        var runtimeInstance = this._viewModel.defaultInstance();
        if (runtimeInstance !== null) {
            var viewModelInstance = new ViewModelInstance(runtimeInstance, null);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, runtimeInstance);
            return viewModelInstance;
        }
        return null;
    };
    ViewModel.prototype.instance = function () {
        var runtimeInstance = this._viewModel.instance();
        if (runtimeInstance !== null) {
            var viewModelInstance = new ViewModelInstance(runtimeInstance, null);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, runtimeInstance);
            return viewModelInstance;
        }
        return null;
    };
    Object.defineProperty(ViewModel.prototype, "properties", {
        get: function () {
            return this._viewModel.getProperties();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "instanceNames", {
        get: function () {
            return this._viewModel.getInstanceNames();
        },
        enumerable: false,
        configurable: true
    });
    return ViewModel;
}());

var DataEnum = /** @class */ (function () {
    function DataEnum(dataEnum) {
        this._dataEnum = dataEnum;
    }
    Object.defineProperty(DataEnum.prototype, "name", {
        get: function () {
            return this._dataEnum.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DataEnum.prototype, "values", {
        get: function () {
            return this._dataEnum.values;
        },
        enumerable: false,
        configurable: true
    });
    return DataEnum;
}());

var PropertyType;
(function (PropertyType) {
    PropertyType["Number"] = "number";
    PropertyType["String"] = "string";
    PropertyType["Boolean"] = "boolean";
    PropertyType["Color"] = "color";
    PropertyType["Trigger"] = "trigger";
    PropertyType["Enum"] = "enum";
    PropertyType["List"] = "list";
    PropertyType["Image"] = "image";
    PropertyType["Font"] = "font";
    PropertyType["Artboard"] = "artboard";
})(PropertyType || (PropertyType = {}));
var ViewModelInstance = /** @class */ (function () {
    function ViewModelInstance(runtimeInstance, parent) {
        this._parents = [];
        this._children = [];
        this._viewModelInstances = new Map();
        this._propertiesWithCallbacks = [];
        this._referenceCount = 0;
        // One per Rive instance this is bound to as its main or a global instance,
        // with how many of that instance's slots hold this.
        this._wakeCallbacks = null;
        this.selfUnref = false;
        this._runtimeInstance = runtimeInstance;
        if (parent !== null) {
            this._parents.push(parent);
        }
    }
    Object.defineProperty(ViewModelInstance.prototype, "runtimeInstance", {
        get: function () {
            return this._runtimeInstance;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModelInstance.prototype, "nativeInstance", {
        get: function () {
            return this._runtimeInstance;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstance.prototype.handleCallbacks = function () {
        if (this._propertiesWithCallbacks.length !== 0) {
            this._propertiesWithCallbacks.forEach(function (property) {
                property.handleCallbacks();
            });
            this._propertiesWithCallbacks.forEach(function (property) {
                property.clearChanges();
            });
        }
        this._children.forEach(function (child) { return child.handleCallbacks(); });
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.internalAddWakeCallback = function (callback) {
        var _a;
        if (!this._wakeCallbacks) {
            this._wakeCallbacks = new Map();
        }
        this._wakeCallbacks.set(callback, ((_a = this._wakeCallbacks.get(callback)) !== null && _a !== void 0 ? _a : 0) + 1);
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.internalRemoveWakeCallback = function (callback) {
        var _a;
        var count = (_a = this._wakeCallbacks) === null || _a === void 0 ? void 0 : _a.get(callback);
        if (count === undefined) {
            return;
        }
        if (count > 1) {
            this._wakeCallbacks.set(callback, count - 1);
        }
        else {
            this._wakeCallbacks.delete(callback);
        }
    };
    /*
     * method for internal use, it shouldn't be called externally.
     * Wakes every Rive instance this is bound to, directly or through any parent.
     */
    ViewModelInstance.prototype.internalWake = function () {
        // Only an instance with settling on has anything to wake, including one
        // mid-frame that hasn't settled yet.
        if (settlingEnabledInstanceCount > 0) {
            this.wakeOwners(new Set());
        }
    };
    ViewModelInstance.prototype.wakeOwners = function (visited) {
        var _a;
        if (visited.has(this)) {
            return;
        }
        visited.add(this);
        (_a = this._wakeCallbacks) === null || _a === void 0 ? void 0 : _a.forEach(function (_count, callback) { return callback(); });
        // Walks the parent chain and wakes all Rive instance owners of that instance
        this._parents.forEach(function (parent) { return parent.wakeOwners(visited); });
    };
    ViewModelInstance.prototype.addParent = function (parent) {
        if (!this._parents.includes(parent)) {
            this._parents.push(parent);
            if (this._propertiesWithCallbacks.length > 0 ||
                this._children.length > 0) {
                parent.addToViewModelCallbacks(this);
            }
        }
    };
    ViewModelInstance.prototype.removeParent = function (parent) {
        var index = this._parents.indexOf(parent);
        if (index !== -1) {
            var parent_1 = this._parents[index];
            parent_1.removeFromViewModelCallbacks(this);
            this._parents.splice(index, 1);
        }
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.addToPropertyCallbacks = function (property) {
        var _this = this;
        if (!this._propertiesWithCallbacks.includes(property)) {
            this._propertiesWithCallbacks.push(property);
            if (this._propertiesWithCallbacks.length > 0) {
                this._parents.forEach(function (parent) {
                    parent.addToViewModelCallbacks(_this);
                });
            }
        }
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.removeFromPropertyCallbacks = function (property) {
        var _this = this;
        if (this._propertiesWithCallbacks.includes(property)) {
            this._propertiesWithCallbacks = this._propertiesWithCallbacks.filter(function (prop) { return prop !== property; });
            if (this._children.length === 0 &&
                this._propertiesWithCallbacks.length === 0) {
                this._parents.forEach(function (parent) {
                    parent.removeFromViewModelCallbacks(_this);
                });
            }
        }
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.addToViewModelCallbacks = function (instance) {
        var _this = this;
        if (!this._children.includes(instance)) {
            this._children.push(instance);
            this._parents.forEach(function (parent) {
                parent.addToViewModelCallbacks(_this);
            });
        }
    };
    /*
     * method for internal use, it shouldn't be called externally
     */
    ViewModelInstance.prototype.removeFromViewModelCallbacks = function (instance) {
        var _this = this;
        if (this._children.includes(instance)) {
            this._children = this._children.filter(function (child) { return child !== instance; });
            if (this._children.length === 0 &&
                this._propertiesWithCallbacks.length === 0) {
                this._parents.forEach(function (parent) {
                    parent.removeFromViewModelCallbacks(_this);
                });
            }
        }
    };
    ViewModelInstance.prototype.clearCallbacks = function () {
        this._propertiesWithCallbacks.forEach(function (property) {
            property.clearCallbacks();
        });
    };
    ViewModelInstance.prototype.propertyFromPath = function (path, type) {
        var pathSegments = path.split("/");
        return this.propertyFromPathSegments(pathSegments, 0, type);
    };
    ViewModelInstance.prototype.viewModelFromPathSegments = function (pathSegments, index) {
        var viewModelInstance = this.internalViewModelInstance(pathSegments[index]);
        if (viewModelInstance !== null) {
            if (index == pathSegments.length - 1) {
                return viewModelInstance;
            }
            else {
                return viewModelInstance.viewModelFromPathSegments(pathSegments, index++);
            }
        }
        return null;
    };
    ViewModelInstance.prototype.propertyFromPathSegments = function (pathSegments, index, type) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        if (index < pathSegments.length - 1) {
            var viewModelInstance = this.internalViewModelInstance(pathSegments[index]);
            if (viewModelInstance !== null) {
                return viewModelInstance.propertyFromPathSegments(pathSegments, index + 1, type);
            }
            else {
                return null;
            }
        }
        var instance = null;
        switch (type) {
            case PropertyType.Number:
                instance = (_b = (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.number(pathSegments[index])) !== null && _b !== void 0 ? _b : null;
                if (instance !== null) {
                    return new ViewModelInstanceNumber(instance, this);
                }
                break;
            case PropertyType.String:
                instance = (_d = (_c = this._runtimeInstance) === null || _c === void 0 ? void 0 : _c.string(pathSegments[index])) !== null && _d !== void 0 ? _d : null;
                if (instance !== null) {
                    return new ViewModelInstanceString(instance, this);
                }
                break;
            case PropertyType.Boolean:
                instance = (_f = (_e = this._runtimeInstance) === null || _e === void 0 ? void 0 : _e.boolean(pathSegments[index])) !== null && _f !== void 0 ? _f : null;
                if (instance !== null) {
                    return new ViewModelInstanceBoolean(instance, this);
                }
                break;
            case PropertyType.Color:
                instance = (_h = (_g = this._runtimeInstance) === null || _g === void 0 ? void 0 : _g.color(pathSegments[index])) !== null && _h !== void 0 ? _h : null;
                if (instance !== null) {
                    return new ViewModelInstanceColor(instance, this);
                }
                break;
            case PropertyType.Trigger:
                instance = (_k = (_j = this._runtimeInstance) === null || _j === void 0 ? void 0 : _j.trigger(pathSegments[index])) !== null && _k !== void 0 ? _k : null;
                if (instance !== null) {
                    return new ViewModelInstanceTrigger(instance, this);
                }
                break;
            case PropertyType.Enum:
                instance = (_m = (_l = this._runtimeInstance) === null || _l === void 0 ? void 0 : _l.enum(pathSegments[index])) !== null && _m !== void 0 ? _m : null;
                if (instance !== null) {
                    return new ViewModelInstanceEnum(instance, this);
                }
                break;
            case PropertyType.List:
                instance = (_p = (_o = this._runtimeInstance) === null || _o === void 0 ? void 0 : _o.list(pathSegments[index])) !== null && _p !== void 0 ? _p : null;
                if (instance !== null) {
                    return new ViewModelInstanceList(instance, this);
                }
                break;
            case PropertyType.Image:
                instance = (_r = (_q = this._runtimeInstance) === null || _q === void 0 ? void 0 : _q.image(pathSegments[index])) !== null && _r !== void 0 ? _r : null;
                if (instance !== null) {
                    return new ViewModelInstanceAssetImage(instance, this);
                }
                break;
            case PropertyType.Font:
                instance = (_t = (_s = this._runtimeInstance) === null || _s === void 0 ? void 0 : _s.font(pathSegments[index])) !== null && _t !== void 0 ? _t : null;
                if (instance !== null) {
                    return new ViewModelInstanceAssetFont(instance, this);
                }
                break;
            case PropertyType.Artboard:
                instance = (_v = (_u = this._runtimeInstance) === null || _u === void 0 ? void 0 : _u.artboard(pathSegments[index])) !== null && _v !== void 0 ? _v : null;
                if (instance !== null) {
                    return new ViewModelInstanceArtboard(instance, this);
                }
                break;
        }
        return null;
    };
    ViewModelInstance.prototype.internalViewModelInstance = function (name) {
        var _a;
        if (this._viewModelInstances.has(name)) {
            return this._viewModelInstances.get(name);
        }
        var viewModelRuntimeInstance = (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.viewModel(name);
        if (viewModelRuntimeInstance !== null) {
            var viewModelInstance = new ViewModelInstance(viewModelRuntimeInstance, this);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, viewModelRuntimeInstance);
            viewModelInstance.internalIncrementReferenceCount();
            this._viewModelInstances.set(name, viewModelInstance);
            return viewModelInstance;
        }
        return null;
    };
    /**
     * method to access a property instance of type number belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the number property
     */
    ViewModelInstance.prototype.number = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Number);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type string belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the string property
     */
    ViewModelInstance.prototype.string = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.String);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type boolean belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the boolean property
     */
    ViewModelInstance.prototype.boolean = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Boolean);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type color belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the ttrigger property
     */
    ViewModelInstance.prototype.color = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Color);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type trigger belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the trigger property
     */
    ViewModelInstance.prototype.trigger = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Trigger);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type enum belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the enum property
     */
    ViewModelInstance.prototype.enum = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Enum);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a property instance of type list belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the list property
     */
    ViewModelInstance.prototype.list = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.List);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a view model property instance belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the image property
     */
    ViewModelInstance.prototype.image = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Image);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a view model property instance belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the font property
     */
    ViewModelInstance.prototype.font = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Font);
        return viewmodelInstanceValue;
    };
    /**
     * method to access an artboard property instance belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the image property
     */
    ViewModelInstance.prototype.artboard = function (path) {
        var viewmodelInstanceValue = this.propertyFromPath(path, PropertyType.Artboard);
        return viewmodelInstanceValue;
    };
    /**
     * method to access a view model property instance belonging
     * to the view model instance or to a nested view model instance
     * @param path - path to the view model property
     */
    ViewModelInstance.prototype.viewModel = function (path) {
        var pathSegments = path.split("/");
        var parentViewModelInstance = pathSegments.length > 1
            ? this.viewModelFromPathSegments(pathSegments.slice(0, pathSegments.length - 1), 0)
            : this;
        if (parentViewModelInstance != null) {
            return parentViewModelInstance.internalViewModelInstance(pathSegments[pathSegments.length - 1]);
        }
        return null;
    };
    ViewModelInstance.prototype.internalReplaceViewModel = function (name, value) {
        var _a;
        if (value.runtimeInstance !== null) {
            var result = ((_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.replaceViewModel(name, value.runtimeInstance)) ||
                false;
            if (result) {
                value.internalIncrementReferenceCount();
                var oldInstance_1 = this.internalViewModelInstance(name);
                if (oldInstance_1 !== null) {
                    oldInstance_1.removeParent(this);
                    if (this._children.includes(oldInstance_1)) {
                        this._children = this._children.filter(function (child) { return child !== oldInstance_1; });
                    }
                    oldInstance_1.cleanup();
                }
                this._viewModelInstances.set(name, value);
                value.addParent(this);
            }
            return result;
        }
        return false;
    };
    /**
     * method to replace a view model property with another view model value
     * @param path - path to the view model property
     * @param value - view model that will replace the original
     */
    ViewModelInstance.prototype.replaceViewModel = function (path, value) {
        var _a;
        this.internalWake();
        var pathSegments = path.split("/");
        var viewModelInstance = pathSegments.length > 1
            ? this.viewModelFromPathSegments(pathSegments.slice(0, pathSegments.length - 1), 0)
            : this;
        return ((_a = viewModelInstance === null || viewModelInstance === void 0 ? void 0 : viewModelInstance.internalReplaceViewModel(pathSegments[pathSegments.length - 1], value)) !== null && _a !== void 0 ? _a : false);
    };
    /*
     * method to add one to the reference counter of the instance.
     * Use if the file owning the reference is destroyed but the instance needs to stay around
     */
    ViewModelInstance.prototype.incrementReferenceCount = function () {
        var _a;
        this._referenceCount++;
        (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.incrementReferenceCount();
    };
    /*
     * method to subtract one to the reference counter of the instance.
     * Use if incrementReferenceCount has been called
     */
    ViewModelInstance.prototype.decrementReferenceCount = function () {
        var _a;
        this._referenceCount--;
        (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.decrementReferenceCount();
    };
    Object.defineProperty(ViewModelInstance.prototype, "properties", {
        get: function () {
            var _a;
            return (((_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.getProperties().map(function (prop) { return (__assign({}, prop)); })) || []);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModelInstance.prototype, "viewModelName", {
        /**
         * Get the name of the ViewModel definition this instance was created from.
         */
        get: function () {
            var _a, _b;
            return (_b = (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.getViewModelName()) !== null && _b !== void 0 ? _b : "";
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstance.prototype.internalIncrementReferenceCount = function () {
        this._referenceCount++;
    };
    ViewModelInstance.prototype.cleanup = function () {
        var _this = this;
        var _a;
        this._referenceCount--;
        if (this._referenceCount <= 0) {
            if (this.selfUnref) {
                (_a = this._runtimeInstance) === null || _a === void 0 ? void 0 : _a.unref();
            }
            this._runtimeInstance = null;
            this.clearCallbacks();
            this._propertiesWithCallbacks = [];
            this._viewModelInstances.forEach(function (value) {
                value.cleanup();
            });
            this._viewModelInstances.clear();
            var children = __spreadArray([], this._children, true);
            this._children.length = 0;
            var parents = __spreadArray([], this._parents, true);
            this._parents.length = 0;
            children.forEach(function (child) {
                child.removeParent(_this);
            });
            parents.forEach(function (parent) {
                parent.removeFromViewModelCallbacks(_this);
            });
        }
    };
    return ViewModelInstance;
}());

var ViewModelInstanceValue = /** @class */ (function () {
    function ViewModelInstanceValue(instance, parent) {
        this.callbacks = [];
        this._viewModelInstanceValue = instance;
        this._parentViewModel = parent;
    }
    ViewModelInstanceValue.prototype.on = function (callback) {
        // Since we don't clean the changed flag for properties that don't have listeners,
        // we clean it the first time we add a listener to it
        if (this.callbacks.length === 0) {
            this._viewModelInstanceValue.clearChanges();
        }
        if (!this.callbacks.includes(callback)) {
            this.callbacks.push(callback);
            this._parentViewModel.addToPropertyCallbacks(this);
        }
    };
    ViewModelInstanceValue.prototype.off = function (callback) {
        if (!callback) {
            this.callbacks.length = 0;
        }
        else {
            this.callbacks = this.callbacks.filter(function (cb) { return cb !== callback; });
        }
        if (this.callbacks.length === 0) {
            this._parentViewModel.removeFromPropertyCallbacks(this);
        }
    };
    ViewModelInstanceValue.prototype.internalHandleCallback = function (callback) { };
    /** Wakes every Rive instance the owning view model instance is bound to. */
    ViewModelInstanceValue.prototype.wakeOwners = function () {
        this._parentViewModel.internalWake();
    };
    ViewModelInstanceValue.prototype.handleCallbacks = function () {
        var _this = this;
        if (this._viewModelInstanceValue.hasChanged) {
            this.callbacks.forEach(function (callback) {
                _this.internalHandleCallback(callback);
            });
        }
    };
    ViewModelInstanceValue.prototype.clearChanges = function () {
        this._viewModelInstanceValue.clearChanges();
    };
    ViewModelInstanceValue.prototype.clearCallbacks = function () {
        this.callbacks.length = 0;
    };
    Object.defineProperty(ViewModelInstanceValue.prototype, "name", {
        get: function () {
            return this._viewModelInstanceValue.name;
        },
        enumerable: false,
        configurable: true
    });
    return ViewModelInstanceValue;
}());

var ViewModelInstanceString = /** @class */ (function (_super) {
    __extends(ViewModelInstanceString, _super);
    function ViewModelInstanceString(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceString.prototype, "value", {
        get: function () {
            return this._viewModelInstanceValue.value;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.value = val;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceString.prototype.internalHandleCallback = function (callback) {
        callback(this.value);
    };
    return ViewModelInstanceString;
}(ViewModelInstanceValue));

var ViewModelInstanceNumber = /** @class */ (function (_super) {
    __extends(ViewModelInstanceNumber, _super);
    function ViewModelInstanceNumber(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceNumber.prototype, "value", {
        get: function () {
            return this._viewModelInstanceValue.value;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.value = val;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceNumber.prototype.internalHandleCallback = function (callback) {
        callback(this.value);
    };
    return ViewModelInstanceNumber;
}(ViewModelInstanceValue));

var ViewModelInstanceBoolean = /** @class */ (function (_super) {
    __extends(ViewModelInstanceBoolean, _super);
    function ViewModelInstanceBoolean(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceBoolean.prototype, "value", {
        get: function () {
            return this._viewModelInstanceValue.value;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.value = val;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceBoolean.prototype.internalHandleCallback = function (callback) {
        callback(this.value);
    };
    return ViewModelInstanceBoolean;
}(ViewModelInstanceValue));

var ViewModelInstanceTrigger = /** @class */ (function (_super) {
    __extends(ViewModelInstanceTrigger, _super);
    function ViewModelInstanceTrigger(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    ViewModelInstanceTrigger.prototype.trigger = function () {
        this.wakeOwners();
        return this._viewModelInstanceValue.trigger();
    };
    ViewModelInstanceTrigger.prototype.internalHandleCallback = function (callback) {
        callback();
    };
    return ViewModelInstanceTrigger;
}(ViewModelInstanceValue));

var ViewModelInstanceEnum = /** @class */ (function (_super) {
    __extends(ViewModelInstanceEnum, _super);
    function ViewModelInstanceEnum(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceEnum.prototype, "value", {
        get: function () {
            return this._viewModelInstanceValue.value;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.value = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModelInstanceEnum.prototype, "valueIndex", {
        get: function () {
            return this._viewModelInstanceValue
                .valueIndex;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.valueIndex = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModelInstanceEnum.prototype, "values", {
        get: function () {
            return this._viewModelInstanceValue.values;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceEnum.prototype.internalHandleCallback = function (callback) {
        callback(this.value);
    };
    return ViewModelInstanceEnum;
}(ViewModelInstanceValue));

var ViewModelInstanceList = /** @class */ (function (_super) {
    __extends(ViewModelInstanceList, _super);
    function ViewModelInstanceList(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceList.prototype, "length", {
        get: function () {
            return this._viewModelInstanceValue.size;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceList.prototype.addInstance = function (instance) {
        this.wakeOwners();
        if (instance.runtimeInstance != null) {
            this._viewModelInstanceValue.addInstance(instance.runtimeInstance);
            instance.addParent(this._parentViewModel);
        }
    };
    ViewModelInstanceList.prototype.addInstanceAt = function (instance, index) {
        this.wakeOwners();
        if (instance.runtimeInstance != null) {
            if (this._viewModelInstanceValue.addInstanceAt(instance.runtimeInstance, index)) {
                instance.addParent(this._parentViewModel);
                return true;
            }
        }
        return false;
    };
    ViewModelInstanceList.prototype.removeInstance = function (instance) {
        this.wakeOwners();
        if (instance.runtimeInstance != null) {
            this._viewModelInstanceValue.removeInstance(instance.runtimeInstance);
            instance.removeParent(this._parentViewModel);
        }
    };
    ViewModelInstanceList.prototype.removeInstanceAt = function (index) {
        this.wakeOwners();
        this._viewModelInstanceValue.removeInstanceAt(index);
    };
    ViewModelInstanceList.prototype.instanceAt = function (index) {
        var runtimeInstance = this._viewModelInstanceValue.instanceAt(index);
        if (runtimeInstance != null) {
            var viewModelInstance = new ViewModelInstance(runtimeInstance, this._parentViewModel);
            (0,_utils__WEBPACK_IMPORTED_MODULE_3__.createFinalization)(viewModelInstance, runtimeInstance);
            return viewModelInstance;
        }
        return null;
    };
    ViewModelInstanceList.prototype.swap = function (a, b) {
        this.wakeOwners();
        this._viewModelInstanceValue.swap(a, b);
    };
    ViewModelInstanceList.prototype.internalHandleCallback = function (callback) {
        callback();
    };
    return ViewModelInstanceList;
}(ViewModelInstanceValue));

var ViewModelInstanceColor = /** @class */ (function (_super) {
    __extends(ViewModelInstanceColor, _super);
    function ViewModelInstanceColor(instance, parent) {
        return _super.call(this, instance, parent) || this;
    }
    Object.defineProperty(ViewModelInstanceColor.prototype, "value", {
        get: function () {
            return this._viewModelInstanceValue.value;
        },
        set: function (val) {
            this.wakeOwners();
            this._viewModelInstanceValue.value = val;
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceColor.prototype.rgb = function (r, g, b) {
        this.wakeOwners();
        this._viewModelInstanceValue.rgb(r, g, b);
    };
    ViewModelInstanceColor.prototype.rgba = function (r, g, b, a) {
        this.wakeOwners();
        this._viewModelInstanceValue.argb(a, r, g, b);
    };
    ViewModelInstanceColor.prototype.argb = function (a, r, g, b) {
        this.wakeOwners();
        this._viewModelInstanceValue.argb(a, r, g, b);
    };
    // Value 0 to 255
    ViewModelInstanceColor.prototype.alpha = function (a) {
        this.wakeOwners();
        this._viewModelInstanceValue.alpha(a);
    };
    // Value 0 to 1
    ViewModelInstanceColor.prototype.opacity = function (o) {
        this.wakeOwners();
        this._viewModelInstanceValue.alpha(Math.round(Math.max(0, Math.min(1, o)) * 255));
    };
    ViewModelInstanceColor.prototype.internalHandleCallback = function (callback) {
        callback(this.value);
    };
    return ViewModelInstanceColor;
}(ViewModelInstanceValue));

var ViewModelInstanceAssetImage = /** @class */ (function (_super) {
    __extends(ViewModelInstanceAssetImage, _super);
    function ViewModelInstanceAssetImage(instance, root) {
        return _super.call(this, instance, root) || this;
    }
    Object.defineProperty(ViewModelInstanceAssetImage.prototype, "value", {
        set: function (image) {
            var _a;
            this.wakeOwners();
            this._viewModelInstanceValue.value((_a = image === null || image === void 0 ? void 0 : image.nativeImage) !== null && _a !== void 0 ? _a : null);
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceAssetImage.prototype.internalHandleCallback = function (callback) {
        callback();
    };
    return ViewModelInstanceAssetImage;
}(ViewModelInstanceValue));

var ViewModelInstanceAssetFont = /** @class */ (function (_super) {
    __extends(ViewModelInstanceAssetFont, _super);
    function ViewModelInstanceAssetFont(instance, root) {
        return _super.call(this, instance, root) || this;
    }
    Object.defineProperty(ViewModelInstanceAssetFont.prototype, "value", {
        set: function (font) {
            var _a;
            this.wakeOwners();
            this._viewModelInstanceValue.value((_a = font === null || font === void 0 ? void 0 : font.nativeFont) !== null && _a !== void 0 ? _a : null);
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceAssetFont.prototype.internalHandleCallback = function (callback) {
        callback();
    };
    return ViewModelInstanceAssetFont;
}(ViewModelInstanceValue));

var ViewModelInstanceArtboard = /** @class */ (function (_super) {
    __extends(ViewModelInstanceArtboard, _super);
    function ViewModelInstanceArtboard(instance, root) {
        return _super.call(this, instance, root) || this;
    }
    Object.defineProperty(ViewModelInstanceArtboard.prototype, "value", {
        set: function (artboard) {
            var _a, _b;
            this.wakeOwners();
            var bindableArtboard;
            if (artboard.isBindableArtboard) {
                bindableArtboard = artboard;
            }
            else {
                bindableArtboard = artboard.file.internalBindableArtboardFromArtboard(artboard.nativeArtboard);
            }
            this._viewModelInstanceValue.value((_a = bindableArtboard === null || bindableArtboard === void 0 ? void 0 : bindableArtboard.nativeArtboard) !== null && _a !== void 0 ? _a : null);
            if (bindableArtboard === null || bindableArtboard === void 0 ? void 0 : bindableArtboard.nativeViewModel) {
                this._viewModelInstanceValue.viewModelInstance((_b = bindableArtboard === null || bindableArtboard === void 0 ? void 0 : bindableArtboard.nativeViewModel) !== null && _b !== void 0 ? _b : null);
            }
        },
        enumerable: false,
        configurable: true
    });
    ViewModelInstanceArtboard.prototype.internalHandleCallback = function (callback) {
        callback();
    };
    return ViewModelInstanceArtboard;
}(ViewModelInstanceValue));

// Loads Rive data from a URI via fetch.
var loadRiveFile = function (src) { return __awaiter(void 0, void 0, void 0, function () {
    var req, res, buffer;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                req = new Request(src);
                return [4 /*yield*/, fetch(req)];
            case 1:
                res = _a.sent();
                if (!res.ok) {
                    throw new Error("Failed to fetch the Rive file: HTTP ".concat(res.status));
                }
                return [4 /*yield*/, res.arrayBuffer()];
            case 2:
                buffer = _a.sent();
                return [2 /*return*/, buffer];
        }
    });
}); };
// #endregion
// #region utility functions
/*
 * Utility function to ensure an object is a string array
 */
var mapToStringArray = function (obj) {
    if (typeof obj === "string") {
        return [obj];
    }
    else if (obj instanceof Array) {
        return obj;
    }
    // If obj is undefined, return empty array
    return [];
};
// #endregion
// #region testing utilities
// Exports to only be used for tests
var Testing = {
    EventManager: EventManager,
    TaskQueueManager: TaskQueueManager,
};
// #endregion
// #region asset loaders
/**
 * Decodes bytes into an audio asset.
 *
 * Be sure to call `.unref()` on the audio once it is no longer needed. This
 * allows the engine to clean it up when it is not used by any more animations.
 */
var decodeAudio = function (bytes) { return __awaiter(void 0, void 0, void 0, function () {
    var decodedPromise, audio, audioWrapper;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                decodedPromise = new Promise(function (resolve) {
                    return _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.getInstance(function (rive) {
                        rive.decodeAudio(bytes, resolve, null);
                    });
                });
                return [4 /*yield*/, decodedPromise];
            case 1:
                audio = _a.sent();
                audioWrapper = new _utils__WEBPACK_IMPORTED_MODULE_3__.AudioWrapper(audio);
                _utils__WEBPACK_IMPORTED_MODULE_3__.finalizationRegistry.register(audioWrapper, audio);
                return [2 /*return*/, audioWrapper];
        }
    });
}); };
/**
 * Decodes bytes into an image.
 *
 * Be sure to call `.unref()` on the image once it is no longer needed. This
 * allows the engine to clean it up when it is not used by any more animations.
 */
var decodeImage = function (bytes) { return __awaiter(void 0, void 0, void 0, function () {
    var decodedPromise, image, imageWrapper;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                decodedPromise = new Promise(function (resolve) {
                    return _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.getInstance(function (rive) {
                        rive.decodeImage(bytes, resolve, null);
                    });
                });
                return [4 /*yield*/, decodedPromise];
            case 1:
                image = _a.sent();
                imageWrapper = new _utils__WEBPACK_IMPORTED_MODULE_3__.ImageWrapper(image);
                _utils__WEBPACK_IMPORTED_MODULE_3__.finalizationRegistry.register(imageWrapper, image);
                return [2 /*return*/, imageWrapper];
        }
    });
}); };
/**
 * Decodes bytes into a font.
 *
 * Be sure to call `.unref()` on the font once it is no longer needed. This
 * allows the engine to clean it up when it is not used by any more animations.
 */
var decodeFont = function (bytes) { return __awaiter(void 0, void 0, void 0, function () {
    var decodedPromise, font, fontWrapper;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                decodedPromise = new Promise(function (resolve) {
                    return _runtimeLoader__WEBPACK_IMPORTED_MODULE_1__.RuntimeLoader.getInstance(function (rive) {
                        rive.decodeFont(bytes, resolve, null);
                    });
                });
                return [4 /*yield*/, decodedPromise];
            case 1:
                font = _a.sent();
                fontWrapper = new _utils__WEBPACK_IMPORTED_MODULE_3__.FontWrapper(font);
                _utils__WEBPACK_IMPORTED_MODULE_3__.finalizationRegistry.register(fontWrapper, font);
                return [2 /*return*/, fontWrapper];
        }
    });
}); };
// #endregion

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=rive.js.map