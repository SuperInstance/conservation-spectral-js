# conservation-spectral-js

[![npm version](https://img.shields.io/npm/v/cocapn)](https://www.npmjs.com/package/cocapn) [![SuperInstance](https://img.shields.io/badge/SuperInstance-Ecosystem-blue)](https://github.com/SuperInstance)



TypeScript SDK for spectral graph conservation analysis — Laplacian eigenvalues, conservation ratios, anomaly detection, and spectral fingerprints. Zero dependencies.

## What This Gives You

- **Tension graphs** — weighted directed graphs with typed edge attributes
- **Laplacian decomposition** — eigenvalue computation with Float64Array storage
- **Conservation ratios** — CR = λ₂/λₙ with spectral gap and Cheeger constant
- **Anomaly detection** — classify anomalies with severity and suggested corrections
- **Spectral fingerprints** — graph identity hashing for cross-system comparison
- **Zero dependencies** — pure TypeScript, runs in Node.js and browsers

## Quick Start

```typescript
import {
  createGraph, addEdge, buildLaplacian,
  eigendecompose, conservationRatio, analyze
} from "conservation-spectral";

// Build a tension graph
const g = createGraph();
addEdge(g, "A", "B", { tension: 0.8 });
addEdge(g, "B", "C", { tension: 0.5 });
addEdge(g, "C", "A", { tension: 0.3 });

// Spectral analysis
const L = buildLaplacian(g);
const eigen = eigendecompose(L);
const cr = conservationRatio(eigen.values);
console.log(`Conservation ratio: ${cr.toFixed(4)}`);

// Full report
const report = analyze(g);
console.log(report);
```

## API Reference

| Module | Exports | Description |
|---|---|---|
| `graph` | `createGraph`, `addEdge`, `addVertex`, `adjacencyMatrix` | Graph construction |
| `laplacian` | `buildLaplacian` | Graph → Laplacian matrix |
| `eigen` | `eigendecompose`, `EigenResult` | Eigenvalue computation |
| `conservation` | `conservationRatio`, `spectralGap`, `cheegerConstant` | Core metrics |
| `tracker` | `ConservationTracker`, `Alert` | Time-series monitoring |
| `fingerprint` | `spectralFingerprint`, `compareFingerprints` | Graph identity |
| `anomaly` | `detectAnomalies`, `Anomaly`, `Fix` | Detection and repair |

## How It Fits

The **TypeScript SDK** of the conservation spectral ecosystem — API-identical to:

- [conservation-spectral-python](https://github.com/SuperInstance/conservation-spectral-python) — Python SDK
- [conservation-spectral-ada](https://github.com/SuperInstance/conservation-spectral-ada) — Ada port
- [conservation-conformance](https://github.com/SuperInstance/conservation-conformance) — cross-language conformance tests
- [conservation-protocol](https://github.com/SuperInstance/conservation-protocol) — Rust messaging protocol

## Testing

```bash
npm test  # 32 tests across 4 test files
```

## Installation

```bash
npm install conservation-spectral
```

## License

MIT

## Documentation

📚 [OpenConstruct Docs](https://github.com/SuperInstance/openconstruct-docs)
