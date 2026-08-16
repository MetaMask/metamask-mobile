export type PerpsConnectionAttemptContext = {
    source: string;
    suppressError: boolean;
};
export declare function getPerpsConnectionAttemptContext(): PerpsConnectionAttemptContext | null;
export declare function withPerpsConnectionAttemptContext<ValueType>(context: PerpsConnectionAttemptContext, callback: () => Promise<ValueType>): Promise<ValueType>;
//# sourceMappingURL=perpsConnectionAttemptContext.d.cts.map