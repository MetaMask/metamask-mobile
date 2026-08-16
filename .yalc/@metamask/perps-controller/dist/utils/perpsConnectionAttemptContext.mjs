let currentAttemptContext = null;
export function getPerpsConnectionAttemptContext() {
    return currentAttemptContext;
}
export async function withPerpsConnectionAttemptContext(context, callback) {
    const previousContext = currentAttemptContext;
    currentAttemptContext = context;
    try {
        return await callback();
    }
    finally {
        currentAttemptContext = previousContext;
    }
}
//# sourceMappingURL=perpsConnectionAttemptContext.mjs.map