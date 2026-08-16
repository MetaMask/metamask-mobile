"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPerpsConnectionAttemptContext = exports.getPerpsConnectionAttemptContext = void 0;
let currentAttemptContext = null;
function getPerpsConnectionAttemptContext() {
    return currentAttemptContext;
}
exports.getPerpsConnectionAttemptContext = getPerpsConnectionAttemptContext;
async function withPerpsConnectionAttemptContext(context, callback) {
    const previousContext = currentAttemptContext;
    currentAttemptContext = context;
    try {
        return await callback();
    }
    finally {
        currentAttemptContext = previousContext;
    }
}
exports.withPerpsConnectionAttemptContext = withPerpsConnectionAttemptContext;
//# sourceMappingURL=perpsConnectionAttemptContext.cjs.map