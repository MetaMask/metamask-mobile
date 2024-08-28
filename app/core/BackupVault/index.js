"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
exports.resetVaultBackup = exports.getVaultFromBackup = exports.backupVault = void 0;
var backupVault_1 = require("./backupVault");
__createBinding(exports, backupVault_1, "backupVault");
__createBinding(exports, backupVault_1, "getVaultFromBackup");
__createBinding(exports, backupVault_1, "resetVaultBackup");
