"use strict";
exports.__esModule = true;
exports.detectSnapLocation = void 0;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var npm_1 = require("./npm");
var snaps_controllers_1 = require("@metamask/snaps-controllers");
/**
 * Auto-magically detects which SnapLocation object to create based on the provided {@link location}.
 *
 * @param location - A {@link https://github.com/MetaMask/SIPs/blob/main/SIPS/sip-8.md SIP-8} uri.
 * @param opts - NPM options and feature flags.
 * @returns SnapLocation based on url.
 * see snaps implementation as a reference: https://github.com/MetaMask/snaps/blob/e6fa41d5f707a7fd7d69555e3f153e78e0385056/packages/snaps-controllers/src/snaps/location/location.ts#L55-L56
 */
function detectSnapLocation(location, opts) {
    var _c, _d;
    var allowHttp = (_c = opts === null || opts === void 0 ? void 0 : opts.allowHttp) !== null && _c !== void 0 ? _c : false;
    var allowLocal = (_d = opts === null || opts === void 0 ? void 0 : opts.allowLocal) !== null && _d !== void 0 ? _d : false;
    var root = location instanceof URL ? location : new URL(location);
    switch (root.protocol) {
        case 'npm:':
            return new npm_1.NpmLocation(root, opts);
        case 'local:':
            if (!allowLocal) {
                throw new TypeError('Fetching local snaps is disabled.');
            }
            else
                return new snaps_controllers_1.LocalLocation(root, opts);
        case 'http:':
        case 'https:':
            if (!allowHttp) {
                throw new TypeError('Fetching snaps through http/https is disabled.');
            }
            else
                return new snaps_controllers_1.HttpLocation(root, opts);
        default:
            throw new TypeError("Unrecognized \"".concat(root.protocol, "\" snap location protocol."));
    }
}
exports.detectSnapLocation = detectSnapLocation;
///: END:ONLY_INCLUDE_IF
