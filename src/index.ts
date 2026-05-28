/**
 * conservation-spectral — Conservation Spectral SDK for JavaScript/TypeScript
 *
 * Spectral graph theory for conservation analysis.
 * Pure TypeScript, zero dependencies, fast Float64Array storage.
 */

// Types
export type {
  Edge,
  TensionGraph,
  LaplacianType,
  Laplacian,
  EigenResult,
  ConservationRatio,
  ConservationReport,
  AnomalyType,
  Anomaly,
  Fix,
  SpectralFingerprint,
  Alert,
  ConservationTrackerState,
} from "./types";

// Graph
export {
  createGraph,
  addVertex,
  addEdge,
  addAttribute,
  vertexCount,
  edgeCount,
  adjacencyMatrix,
  buildTransitionMatrix,
} from "./graph";

// Laplacian
export { buildLaplacian } from "./laplacian";

// Eigensolvers
export { jacobiEigen, lanczosEigen, eigendecompose } from "./eigen";

// Conservation analysis
export {
  conservationRatio,
  conservationRatios,
  spectralGap,
  cheegerConstant,
  analyze,
} from "./conservation";

// Fingerprint
export { spectralFingerprint, compareFingerprints } from "./fingerprint";

// Anomaly
export { detectAnomalies, suggestCorrection } from "./anomaly";

// Tracker
export { ConservationTracker } from "./tracker";
