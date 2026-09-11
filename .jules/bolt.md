## 2024-05-18 - [O(N*M) bottlenecks in React store rendering]
**Learning:** React state selector patterns doing nested searches (`.find()` inside a `.filter()`) loop over the parent array and iterate through another array element to look up foreign keys, generating an O(N*M) bottleneck during filtering.
**Action:** When filtering relational store arrays inside `useMemo` loops, precompute a HashMap (`Map`) so ID lookups are O(1) instead, achieving an overall O(N + M) complexity.
