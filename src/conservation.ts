/**
 * Conservation analysis — ratios, spectral gap, Cheeger constant
 */

import type {
  ConservationRatio,
  ConservationReport,
  Anomaly,
  LaplacianType,
} from "./types";
import type { Laplacian } from "./types";
import { eigendecompose } from "./eigen";
import { spectralFingerprint } from "./fingerprint";
import { detectAnomalies } from "./anomaly";

/**
 * Conservation ratio for one attribute along eigenvector k.
 * CR(k) = variance of gradient of (attribute projected onto eigenvector k).
 * Low CR → attribute is conserved in this spectral mode.
 */
export function conservationRatio(
  eigenvalues: Float64Array,
  eigenvectors: Float64Array[],
  attribute: Float64Array,
  k: number
): number {
  const n = attribute.length;
  const phi = eigenvectors[k];

  // Project attribute onto eigenvector k
  let projection = 0;
  for (let i = 0; i < n; i++) projection += phi[i] * attribute[i];

  // Compute gradient: diff of projected values sorted by eigenvector order
  // We compute: variance of (attribute[i] * phi[i]) differences
  const projected = new Float64Array(n);
  for (let i = 0; i < n; i++) projected[i] = attribute[i] * phi[i];

  // Gradient = consecutive differences
  const diffs = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) diffs[i] = projected[i + 1] - projected[i];

  if (diffs.length === 0) return Infinity;

  // Variance of diffs
  let mean = 0;
  for (let i = 0; i < diffs.length; i++) mean += diffs[i];
  mean /= diffs.length;

  let variance = 0;
  for (let i = 0; i < diffs.length; i++) variance += (diffs[i] - mean) ** 2;
  variance /= diffs.length;

  return variance;
}

/**
 * Batch conservation ratios for all eigenvectors.
 */
export function conservationRatios(
  eigenvalues: Float64Array,
  eigenvectors: Float64Array[],
  attribute: Float64Array,
  attributeName = "default"
): ConservationRatio[] {
  const ratios: ConservationRatio[] = [];
  for (let k = 0; k < eigenvalues.length; k++) {
    ratios.push({
      eigenvectorIndex: k,
      eigenvalue: eigenvalues[k],
      ratio: conservationRatio(eigenvalues, eigenvectors, attribute, k),
      attributeName,
    });
  }
  return ratios;
}

/**
 * Spectral gap = largest gap between consecutive eigenvalues.
 * Usually λ₁ - λ₀ = second-smallest - smallest (the Fiedler value).
 */
export function spectralGap(eigenvalues: Float64Array): number {
  if (eigenvalues.length < 2) return 0;
  let maxGap = 0;
  for (let i = 1; i < eigenvalues.length; i++) {
    const gap = eigenvalues[i] - eigenvalues[i - 1];
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

/**
 * Cheeger constant approximation from Fiedler vector.
 * h(G) ≈ min cut ratio when partitioning by Fiedler vector threshold.
 */
export function cheegerConstant(
  weightMatrix: Float64Array,
  degrees: Float64Array,
  fiedler: Float64Array,
  n: number
): number {
  // Sort indices by Fiedler value
  const indices = fiedler.map((_, i) => i);
  indices.sort((a, b) => fiedler[a] - fiedler[b]);

  let totalDegree = 0;
  for (let i = 0; i < n; i++) totalDegree += degrees[i];

  let bestCheeger = Infinity;
  let volS = 0;

  for (let k = 0; k < n - 1; k++) {
    const idx = indices[k];
    volS += degrees[idx];

    let cut = 0;
    for (let i = 0; i <= k; i++) {
      for (let j = k + 1; j < n; j++) {
        cut += weightMatrix[indices[i] * n + indices[j]];
      }
    }

    const volComplement = totalDegree - volS;
    const volMin = Math.min(volS, volComplement);
    if (volMin > 0) {
      const h = cut / volMin;
      if (h < bestCheeger) bestCheeger = h;
    }
  }

  return bestCheeger === Infinity ? 0 : bestCheeger;
}

/**
 * Full analysis: Laplacian → eigendecomposition → report.
 */
export function analyze(
  transitions: Float64Array,
  n: number,
  attribute: Float64Array,
  attributeName = "default",
  laplacianType: LaplacianType = "unnormalized",
  similarityKernel?: (i: number, j: number) => number
): ConservationReport {
  // Build Laplacian inline (avoid circular import)
  const kernel = similarityKernel ?? (() => 1.0);
  const W = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      W[i * n + j] = transitions[i * n + j] * kernel(i, j);

  const degrees = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) d += W[i * n + j];
    degrees[i] = d;
  }

  const L = new Float64Array(n * n);
  if (laplacianType === "unnormalized") {
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        L[i * n + j] = (i === j ? degrees[i] : 0) - W[i * n + j];
  } else if (laplacianType === "symmetric_normalized") {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          L[i * n + i] = degrees[i] > 0 ? 1 : 0;
        } else {
          const di = Math.sqrt(degrees[i]);
          const dj = Math.sqrt(degrees[j]);
          if (di > 0 && dj > 0) L[i * n + j] = -W[i * n + j] / (di * dj);
        }
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          L[i * n + i] = degrees[i] > 0 ? 1 : 0;
        } else {
          if (degrees[i] > 0) L[i * n + j] = -W[i * n + j] / degrees[i];
        }
      }
    }
  }

  const eigen = eigendecompose(L, n, 0, laplacianType);
  const ratios = conservationRatios(eigen.values, eigen.vectors, attribute, attributeName);
  const gap = spectralGap(eigen.values);
  const fiedler = eigen.vectors.length > 1 ? eigen.vectors[1] : eigen.vectors[0];
  const cheeger = cheegerConstant(W, degrees, fiedler, n);

  const fp = spectralFingerprint(eigen.values, eigen.vectors);
  fp.conservationProfile = ratios.map((r) => r.ratio);

  const anomalies = detectAnomalies(ratios, eigen.values, eigen.vectors, attribute);

  return {
    ratios,
    anomalies,
    spectralGap: gap,
    cheegerConstant: cheeger,
    fingerprint: fp,
  };
}
