# Graph Report - portfolio  (2026-09-16)

## Corpus Check
- 2 files · ~3,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 20 nodes · 21 edges · 2 communities
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a913521`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- script.js
- updateSnapMode

## God Nodes (most connected - your core abstractions)
1. `updateSnapMode()` - 3 edges
2. `getAboutTop()` - 2 edges
3. `setSnapType()` - 2 edges
4. `menuToggle` - 1 edges
5. `mobileMenu` - 1 edges
6. `iconOpen` - 1 edges
7. `iconClose` - 1 edges
8. `panels` - 1 edges
9. `heroContent` - 1 edges
10. `scrollHint` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (2 total, 0 thin omitted)

### Community 0 - "script.js"
Cohesion: 0.12
Nodes (12): aboutSection, canvas, heroContent, iconClose, iconOpen, menuToggle, mobileMenu, navLinks (+4 more)

### Community 1 - "updateSnapMode"
Cohesion: 0.67
Nodes (3): getAboutTop(), setSnapType(), updateSnapMode()

## Knowledge Gaps
- **12 isolated node(s):** `menuToggle`, `mobileMenu`, `iconOpen`, `iconClose`, `panels` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 16 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `updateSnapMode()` connect `updateSnapMode` to `script.js`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `menuToggle`, `mobileMenu`, `iconOpen` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._