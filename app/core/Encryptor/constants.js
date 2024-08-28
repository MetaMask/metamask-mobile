"use strict";
exports.__esModule = true;
exports.DERIVATION_OPTIONS_DEFAULT_OWASP2023 = exports.DERIVATION_OPTIONS_MINIMUM_OWASP2023 = exports.LEGACY_DERIVATION_OPTIONS = exports.KDF_ALGORITHM = exports.ENCRYPTION_LIBRARY = exports.CipherAlgorithm = exports.ShaAlgorithm = exports.KeyDerivationIteration = exports.SHA256_DIGEST_LENGTH = exports.SALT_BYTES_COUNT = void 0;
exports.SALT_BYTES_COUNT = 32;
exports.SHA256_DIGEST_LENGTH = 256;
/**
 * We use "OWASP2023" to indicate the source and year of the recommendation.
 * This will help us version the recommend number in case it changes in the future.
 * Source: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
 */
var KeyDerivationIteration;
(function (KeyDerivationIteration) {
    // Legacy, kept for backward compatibility
    KeyDerivationIteration[KeyDerivationIteration["Legacy5000"] = 5000] = "Legacy5000";
    // OWASP's 2023 recommendation for minimum iterations
    KeyDerivationIteration[KeyDerivationIteration["OWASP2023Minimum"] = 600000] = "OWASP2023Minimum";
    // Default suggested iterations based on OWASP's 2023 recommendation
    KeyDerivationIteration[KeyDerivationIteration["OWASP2023Default"] = 900000] = "OWASP2023Default";
})(KeyDerivationIteration = exports.KeyDerivationIteration || (exports.KeyDerivationIteration = {}));
/**
 * Supported SHA algorithms in react-native-aes v3.0.3
 */
var ShaAlgorithm;
(function (ShaAlgorithm) {
    ShaAlgorithm["Sha256"] = "sha256";
    ShaAlgorithm["Sha512"] = "sha512";
})(ShaAlgorithm = exports.ShaAlgorithm || (exports.ShaAlgorithm = {}));
/**
 * Supported cipher algorithms in react-native-aes v3.0.3
 *
 * Important Note: Make sure to validate the compatibility of the algorithm with the underlying library.
 * The react-native-aes-crypto does a string validation for the algorithm, so it's important to make sure
 * we're using the correct string.
 *
 * References:
 * - encrypt: https://github.com/MetaMask/metamask-mobile/pull/9947#:~:text=When-,encrypting,-and%20decypting%20the
 * - decrypt: https://github.com/MetaMask/metamask-mobile/pull/9947#:~:text=When%20encrypting%20and-,decypting,-the%20library%20uses
 */
var CipherAlgorithm;
(function (CipherAlgorithm) {
    CipherAlgorithm["cbc"] = "aes-cbc-pkcs7padding";
    CipherAlgorithm["ctr"] = "aes-ctr-pkcs5padding";
})(CipherAlgorithm = exports.CipherAlgorithm || (exports.CipherAlgorithm = {}));
/**
 * Used as a "tag" to identify the underlying encryption library.
 *
 * When no tag is specified, this means our "forked" encryption library has been used.
 */
exports.ENCRYPTION_LIBRARY = {
    original: 'original'
};
/**
 * Key derivation algorithm used to generate keys from a password.
 */
exports.KDF_ALGORITHM = 'PBKDF2';
/**
 * Default key derivation options.
 */
exports.LEGACY_DERIVATION_OPTIONS = {
    algorithm: exports.KDF_ALGORITHM,
    params: {
        iterations: KeyDerivationIteration.Legacy5000
    }
};
exports.DERIVATION_OPTIONS_MINIMUM_OWASP2023 = {
    algorithm: exports.KDF_ALGORITHM,
    params: {
        iterations: KeyDerivationIteration.OWASP2023Minimum
    }
};
exports.DERIVATION_OPTIONS_DEFAULT_OWASP2023 = {
    algorithm: exports.KDF_ALGORITHM,
    params: {
        iterations: KeyDerivationIteration.OWASP2023Default
    }
};
