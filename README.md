# conservation-spectral-js

TypeScript SDK for spectral graph theory conservation analysis — Laplacian construction, eigendecomposition, anomaly detection, and spectral fingerprinting. Pure TypeScript, zero dependencies.

## What This Gives You

- **Tension graphs** — Weighted undirected graphs with `Float64Array` storage for fast spectral math
- **Laplacian matrices** — Unnormalized, normalized, and random-walk variants
- **Jacobi eigensolver** — Pure TypeScript eigenvalue/eigenvector computation (no native deps)
- **Conservation ratios** — Measure how each eigenvector preserves vertex attributes
- **Anomaly detection** — Conservation violations, structural breaks, and spectral outliers with fix suggestions
- **Spectral fingerprints** — Eigenvalue-based fingerprints for comparing graph states
- **Real-time tracking** — Sliding-window conservation monitor with alerts

## Quick Start

```typescript
import {
  createGraph, addVertex, addEdge,
  buildLaplacian, jacobiEigen,
  conservationRatio, spectralGap,
  detectAnomalies,
} from "conservation-spectral";

// Build a tension graph
const g = createGraph(false);
["C", "G", "Am", "F"].forEach(c => addVertex(g, c));
addEdge(g, "C", "G", 0.8);
addEdge(g, "G", "Am", 0.6);
addEdge(g, "Am", "F", 0.4);

// Spectral analysis
const lap = buildLaplacian(g, "unnormalized");
const eigen = jacobiEigen(lap.matrix, lap.n, lap.n * lap.n * 10);

console.log(`Spectral gap: ${spectralGap(eigen)}`);
console.log(`Eigenvalues: ${Array.from(eigen.values)}`);
```

See [`examples/token-analysis.ts`](examples/token-analysis.ts) for a full analysis demo.

## API Reference

| Module | Key Exports |
|--------|-------------|
| `graph` | `createGraph`, `addVertex`, `addEdge`, `addAttribute`, `adjacencyMatrix` |
| `laplacian` | `buildLaplacian` |
| `eigen` | `jacobiEigen` |
| `conservation` | `conservationRatio`, `spectralGap`, `cheegerConstant`, `analyze` |
| `tracker` | `ConservationTracker`, `Alert` |
| `fingerprint` | `spectralFingerprint`, `compareFingerprints` |
| `anomaly` | `detectAnomalies`, `Anomaly`, `AnomalyType`, `Fix` |

## How It Fits

Part of the conservation spectral ecosystem — this is the **TypeScript implementation**. Cross-language siblings:

- **Rust**: [conservation-spectral](https://github.com/SuperInstance/conservation-spectral) — core engine
- **Python**: [conservation-spectral-python](https://github.com/SuperInstance/conservation-spectral-python) — Python SDK
- **Ada**: [conservation-spectral-ada](https://github.com/SuperInstance/conservation-spectral-ada) — DO-178C certified
- **Conformance**: [conservation-conformance](https://github.com/SuperInstance/conservation-conformance) — cross-language test suite

## Testing

```bash
npm install
npm test
```

Uses [Vitest](https://vitest.dev/) with 4 test suites covering eigendecomposition, graph construction, conservation analysis, and real-time tracking.

## Installation

```bash
npm install conservation-spectral
```

Zero runtime dependencies. Requires TypeScript ≥ 5.4 for development.

## License

MIT
