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
exports.TextColor = exports.TextVariant = exports["default"] = void 0;
var Text_1 = require("./Text");
__createBinding(exports, Text_1, "default");
var Text_types_1 = require("./Text.types");
__createBinding(exports, Text_types_1, "TextVariant");
__createBinding(exports, Text_types_1, "TextColor");
