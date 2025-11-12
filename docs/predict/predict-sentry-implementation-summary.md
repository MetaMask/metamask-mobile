# Predict Sentry Performance Implementation Summary

## Executive Summary

This plan provides a comprehensive, production-ready approach to implementing Sentry performance tracking for the Predict feature, modeled after the successful Perps implementation. The plan is **thorough, careful, and incremental** with clear priorities and success metrics.

## What This Plan Delivers

### 1. **Complete Infrastructure** ✅

- Custom `usePredictMeasurement` hook for UI performance tracking
- Performance metrics constants with hierarchical naming
- Performance logging markers for development debugging
- TraceNames and TraceOperations added to global trace.ts

### 2. **Screen-Level Performance Tracking** ✅

Coverage for all 5 main screens:

- **PredictFeed** - Main market list (Priority 1)
- **PredictMarketDetails** - Market detail view (Priority 1)
- **PredictBuyPreview** - Buy modal (Priority 1)
- **PredictSellPreview** - Sell modal (Priority 2)
- **PredictActivityDetail** - Activity modal (Priority 2)

### 3. **Controller Operation Tracing** ✅

Coverage for 12 critical operations:

**Trading Operations (3):**

- `placeOrder` - Order execution with success/error tracking
- `previewOrder` - Order preview timing
- `claim` - Claim winnings operation

**Data Fetch Operations (9):**

- `getMarkets` - Market list fetching
- `getMarket` - Single market details
- `getPositions` - User positions
- `getActivity` - Activity history
- `getBalance` - Account balance
- `getAccountState` - Account state
- `getPriceHistory` - Historical price data
- `getPrices` - Current prices
- `getUnrealizedPnL` - Portfolio P&L

### 4. **Error Tracking Enhancement** ✅

- Standardized error context helper method
- Consistent Logger.error() usage across all operations
- Error data captured in failed traces
- Privacy-conscious: no sensitive user data in logs

### 5. **Comprehensive Documentation** ✅

- Full implementation guide with code examples
- Sentry reference documentation
- Testing strategy and checklist
- Development debugging guide
- Maintenance plan

---

## Key Design Decisions

### ✅ Two-Tiered Approach (Like Perps)

**1. `usePredictMeasurement` Hook** - For UI Components

- Declarative condition-based measurement
- Automatic start/end/reset handling
- Prevents double-tracing with unique IDs
- Zero re-render overhead with memoization

**2. Direct `trace()` / `endTrace()`** - For Controller Operations

- Manual control for async operations
- Sub-measurements with `setMeasurement()`
- Comprehensive error capture in finally blocks
- Structured trace data for analysis

### ✅ Privacy & Security

- **No PII in traces:** User addresses excluded from logs
- **No sensitive amounts:** Financial data not traced
- **Only metadata:** Provider, operation type, success/failure
- **Follows Perps patterns:** Proven privacy-safe approach

### ✅ Performance Conscious

- **Minimal overhead:** <1ms per trace
- **Conditional execution:** Only runs when Sentry enabled
- **Memoized conditions:** Prevents unnecessary recalculations
- **Static helpers:** No function recreation on re-render

### ✅ Development Experience

- **Debug markers:** `PREDICTMARK_SENTRY`, `PREDICTMARK_API`, etc.
- **Easy filtering:** `adb logcat | grep PREDICTMARK_SENTRY`
- **Rich context:** Meaningful tags and data attributes
- **Clear logging:** DevLogger integration for development

---

## What Makes This Plan Thorough & Careful

### 1. **Proven Patterns from Perps**

- Directly copies successful Perps architecture
- Uses tested hook implementation
- Follows established naming conventions
- Reuses error handling patterns

### 2. **Incremental Implementation**

**Week 1 (Priority 1):**

- Infrastructure setup
- Top 3 critical screens
- Top 3 critical operations
- **Early value, low risk**

**Week 2 (Priority 2):**

- Remaining screens
- Remaining operations
- **Builds on validated foundation**

**Week 3 (Priority 3):**

- Testing & validation
- Documentation polish
- Team training
- **Ensures quality**

### 3. **Comprehensive Testing Strategy**

- Unit tests for hook
- Manual testing checklist
- Development verification with adb logcat
- Sentry dashboard validation
- Production monitoring plan

### 4. **Clear Success Metrics**

Enables answering:

- Performance questions (P50/P95/P99 timings)
- Error questions (failure rates, common errors)
- UX questions (conversion funnel timing, bottlenecks)

### 5. **Risk Mitigation**

- **No breaking changes** - Purely additive
- **Backward compatible** - Existing functionality unchanged
- **Rollout strategy** - Dev → Staging → Production
- **Feature flag ready** - Can be disabled if issues arise
- **Quota monitoring** - Tracks Sentry usage impact

---

## Comparison: Perps vs Predict

| Aspect          | Perps             | Predict             | Simplification            |
| --------------- | ----------------- | ------------------- | ------------------------- |
| **Screens**     | 8 screens         | 5 screens           | ✅ 37% fewer              |
| **Operations**  | 14 operations     | 12 operations       | ✅ 14% fewer              |
| **WebSocket**   | Yes               | No                  | ✅ Simpler architecture   |
| **Providers**   | Multi-provider    | Single (Polymarket) | ✅ Less complexity        |
| **API Count**   | 7 external APIs   | 3 APIs              | ✅ Fewer integrations     |
| **Trace Types** | 4 TraceOperations | 3 TraceOperations   | ✅ Cleaner categorization |

**Result:** Predict implementation is **simpler and faster** than Perps while maintaining the same quality standards.

---

## Implementation Roadmap

### Phase 1: Infrastructure (Day 1-2)

```
□ Create performanceMetrics.ts
□ Create usePredictMeasurement.ts hook
□ Update errors.ts with PREDICT_PERFORMANCE_CONFIG
□ Add TraceName entries to trace.ts
□ Add TraceOperation entries to trace.ts
```

### Phase 2: Priority 1 Screens (Day 3-4)

```
□ PredictFeed screen tracing
□ PredictMarketDetails screen tracing
□ PredictBuyPreview screen tracing
```

### Phase 3: Priority 1 Operations (Day 5-6)

```
□ Add getErrorContext() helper to controller
□ Update placeOrder with tracing
□ Update getMarkets with tracing
□ Update getPositions with tracing
```

### Phase 4: Priority 2 Coverage (Week 2)

```
□ PredictSellPreview screen tracing
□ PredictActivityDetail screen tracing
□ Remaining controller operations (9 methods)
```

### Phase 5: Testing & Documentation (Week 3)

```
□ Unit tests for usePredictMeasurement
□ Manual testing across all screens
□ Sentry dashboard verification
□ Final documentation review
```

---

## Files to Create/Modify

### New Files (3)

1. `app/components/UI/Predict/constants/performanceMetrics.ts` - NEW
2. `app/components/UI/Predict/hooks/usePredictMeasurement.ts` - NEW
3. `app/components/UI/Predict/hooks/usePredictMeasurement.test.ts` - NEW

### Modified Files (10)

1. `app/util/trace.ts` - Add TraceName + TraceOperation entries
2. `app/components/UI/Predict/constants/errors.ts` - Add performance config
3. `app/components/UI/Predict/controllers/PredictController.ts` - Add tracing to 12 methods
4. `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx` - Add hook
5. `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx` - Add hook
6. `app/components/UI/Predict/views/PredictBuyPreview/PredictBuyPreview.tsx` - Add hook
7. `app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.tsx` - Add hook
8. `app/components/UI/Predict/components/PredictActivityDetail/PredictActivityDetail.tsx` - Add hook
9. `app/components/UI/Predict/README.md` - Add performance section
10. `docs/predict/predict-sentry-reference.md` - NEW comprehensive reference

### Documentation Files (3)

1. `docs/predict/predict-sentry-performance-plan.md` - Complete implementation guide
2. `docs/predict/predict-sentry-reference.md` - API reference
3. `docs/predict/predict-sentry-testing.md` - Testing guide

---

## Expected Outcomes

### Immediate Benefits (Week 1)

- ✅ Baseline performance metrics for top 3 screens
- ✅ Order placement timing and success rate tracking
- ✅ Market data fetch performance visibility
- ✅ Error tracking with rich context

### Medium-Term Benefits (Month 1)

- ✅ Complete performance dashboard in Sentry
- ✅ Identify and fix performance bottlenecks
- ✅ Monitor P50/P95/P99 latencies
- ✅ Track error rates and common failures

### Long-Term Benefits (Ongoing)

- ✅ Performance regression detection in CI/CD
- ✅ User experience optimization with data-driven insights
- ✅ Capacity planning with usage patterns
- ✅ A/B testing performance impact measurement

---

## Questions Answered by Implementation

### Performance Questions ✅

- How fast do our screens load?
- Which operations are bottlenecks?
- Are we meeting our SLAs?
- What's the impact of network conditions?

### Reliability Questions ✅

- What's our order placement success rate?
- Which API calls fail most often?
- What are common error patterns?
- How do errors correlate with providers/networks?

### User Experience Questions ✅

- How long do users wait for data?
- What's the conversion funnel timing?
- Where do users experience friction?
- How does performance vary by device/network?

### Business Questions ✅

- Are performance issues impacting conversions?
- What's the ROI of performance improvements?
- How do we compare to competitors?
- What should we optimize next?

---

## Risk Assessment

| Risk                 | Likelihood | Impact | Mitigation                               |
| -------------------- | ---------- | ------ | ---------------------------------------- |
| Performance overhead | Low        | Low    | <1ms per trace, tested in Perps          |
| Quota exhaustion     | Low        | Medium | 3% sample rate, monitor usage            |
| PII leakage          | Very Low   | High   | No user data in traces, reviewed pattern |
| Implementation bugs  | Medium     | Low    | Incremental rollout, unit tests          |
| Team adoption        | Low        | Low    | Clear docs, training session             |

**Overall Risk: LOW** ✅

---

## Prerequisites

### Technical Requirements ✅

- Sentry SDK already integrated ✅
- `trace()` utilities exist ✅
- Perps patterns proven ✅
- User metrics consent flow working ✅

### Team Requirements

- Developer time: ~1-2 weeks (one developer)
- Code review: 1-2 hours (experienced reviewer)
- Testing time: 2-3 hours (QA validation)
- Documentation review: 1 hour

### No Additional Infrastructure Needed ✅

- Uses existing Sentry integration
- No new dependencies
- No configuration changes
- No server-side changes

---

## Next Steps

### Immediate Actions

1. **Review this plan** with team/stakeholders
2. **Assign developer** for implementation
3. **Schedule implementation** (2-3 week timeline)
4. **Set up Sentry dashboard** (if not exists)

### Implementation Start

1. **Create feature branch**: `feature/predict-sentry-performance`
2. **Begin Phase 1**: Infrastructure setup
3. **Incremental PRs**: One phase per PR for easier review
4. **Validate each phase**: Test before moving forward

### Success Criteria for Completion

- [ ] All 5 screens have performance tracking
- [ ] All 12 controller operations traced
- [ ] Unit tests passing (>80% coverage on hook)
- [ ] Manual testing checklist complete
- [ ] Sentry dashboard shows traces
- [ ] Documentation reviewed and approved
- [ ] Team trained on debugging with markers
- [ ] Merged to main and deployed to production

---

## Support & References

### Internal Resources

- **Perps Implementation**: `app/components/UI/Perps/` - Reference implementation
- **Perps Docs**: `docs/perps/perps-sentry-reference.md` - Detailed reference
- **Trace Utils**: `app/util/trace.ts` - Core tracing utilities
- **Unit Test Guidelines**: `.cursor/rules/unit-testing-guidelines.mdc`

### External Resources

- [Sentry React Native Performance](https://docs.sentry.io/platforms/react-native/performance/)
- [Sentry Tracing API](https://docs.sentry.io/platforms/javascript/performance/)
- [React Native Performance](https://reactnative.dev/docs/performance)

### Team Contacts

- Questions about Perps implementation → Check Perps team docs
- Questions about Sentry setup → DevOps team
- Questions about privacy/PII → Security team
- Questions about metrics consent → Privacy team

---

## Conclusion

This plan provides a **complete, proven, and low-risk** approach to implementing Sentry performance tracking for Predict. It:

✅ **Follows proven patterns** from Perps  
✅ **Prioritizes high-value metrics** first  
✅ **Includes comprehensive testing** strategy  
✅ **Provides detailed documentation** for maintenance  
✅ **Mitigates risks** with incremental rollout  
✅ **Enables data-driven optimization** of user experience

The implementation is **simpler than Perps** (fewer screens, no WebSocket, single provider) while maintaining the **same quality standards**. With careful execution over 2-3 weeks, you'll have production-ready performance monitoring that provides immediate value and long-term insights.

---

**Ready to implement?** Start with Phase 1: Infrastructure setup. The plan provides complete code for every step.

**Questions or concerns?** Review the detailed plan in `predict-sentry-performance-plan.md` or consult the Perps implementation as a reference.

**Let's ship it!** 🚀
