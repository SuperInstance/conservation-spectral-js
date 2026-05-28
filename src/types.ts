/**
 * conservation-spectral — TypeScript types
 */

// ── Graph ────────────────────────────────────────────────

export interface Edge<V> {
  source: V;
  target: V;
  weight: number;
}

export interface TensionGraph<V> {
  /** Ordered vertex list */
  vertices: V[];
  /** Map vertex → index in vertices[] */
  vertexIndex: Map<V, number>;
  /** adjacency[i] = list of (neighborIndex, weight) */
  adjacency: Array<Array<[number, number]>>;
  /** Named attributes: Map<name, Float64Array of length n> */
  attributes: Map<string, Float64Array>;
  directed: boolean;
}

// ── Laplacian ────────────────────────────────────────────

export type LaplacianType =
  | "unnormalized"
  | "symmetric_normalized"
  | "random_walk_normalized";

export interface Laplacian {
  /** Flat row-major n×n matrix (Float64Array, length n*n) */
  matrix: Float64Array;
  degreeMatrix: Float64Array;
  weightMatrix: Float64Array;
  degrees: Float64Array;
  normalized: boolean;
  numVertices: number;
}

// ── Eigendecomposition ───────────────────────────────────

export interface EigenResult {
  /** Eigenvalues sorted ascending (length n) */
  values: Float64Array;
  /** Eigenvectors: vectors[k] is the k-th eigenvector (length n) */
  vectors: Float64Array[];
  /** Which Laplacian type was used */
  laplacianType: LaplacianType;
}

// ── Conservation ─────────────────────────────────────────

export interface ConservationRatio {
  eigenvectorIndex: number;
  eigenvalue: number;
  ratio: number;
  attributeName: string;
}

export interface ConservationReport {
  ratios: ConservationRatio[];
  anomalies: Anomaly[];
  spectralGap: number;
  cheegerConstant: number;
  fingerprint: SpectralFingerprint;
}

// ── Anomaly / Fix ────────────────────────────────────────

export type AnomalyType =
  | "conservation_violation"
  | "structural_break"
  | "spectral_outlier"
  | "transition_anomaly";

export interface Anomaly {
  vertexId: number;
  eigenvectorIndex: number;
  deviation: number;
  anomalyType: AnomalyType;
  description: string;
}

export interface Fix {
  edge?: [number, number];
  vertex?: number;
  suggestedWeight?: number;
  description: string;
  confidence: number;
}

// ── Fingerprint ──────────────────────────────────────────

export interface SpectralFingerprint {
  eigenvalueHistogram: number[];
  spectralEntropy: number;
  effectiveDimension: number;
  gapProfile: number[];
  conservationProfile: number[];
}

// ── Tracker ──────────────────────────────────────────────

export interface Alert {
  score: number;
  delta: number;
  isAnomaly: boolean;
  timestamp: number;
}

export interface ConservationTrackerState {
  windowSize: number;
  numComponents: number;
  baseline: number | null;
  baselineEstablished: boolean;
}
