## 2026-09-10 - [O(N*M) Rendering Bottleneck in Relational Filtering]

**Learning:** In React hooks (e.g., `useMemo`), using nested `.find()` or `.filter()` iterations on large arrays inside another array iteration causes severe O(N\*M) rendering bottlenecks for relational filtering. This architectural pattern dramatically degrades performance on larger datasets.
**Action:** Precompute a `Set` of valid IDs first using the target dataset (O(N)), then perform an O(1) `.has()` check on the main array for O(N + M) performance overall. Always look for this optimization opportunity when filtering relational data in hooks.
