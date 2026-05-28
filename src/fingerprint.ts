/**
 * Spectral fingerprinting — summary statistics of the eigenspectrum
 */

import type { SpectralFingerprint } from "./types";

/**
 * Compute spectral fingerprint from eigendecomposition.
 */
export function spectralFingerprint(
  eigenvalues: Float64Array,
  eigenvectors: Float64Array[]
): SpectralFingerprint {
  const n = eigenvalues.length;

  // Eigenvalue histogram: bin into ceil(sqrt(n)) bins
  const nBins = Math.max(2, Math.ceil(Math.sqrt(n)));
  let emin = Infinity;
  let emax = -Infinity;
  for (let i = 0; i < n; i++) {
    if (eigenvalues[i] < emin) emin = eigenvalues[i];
    if (eigenvalues[i] > emax) emax = eigenvalues[i];
  }

  const histogram = new Array(nBins).fill(0);
  const binWidth = (emax - emin) / nBins || 1;
  for (let i = 0; i < n; i++) {
    let bin = Math.floor((eigenvalues[i] - emin) / binWidth);
    if (bin >= nBins) bin = nBins - 1;
    histogram[bin]++;
  }

  // Spectral entropy: H = -Σ p_i ln(p_i) where p_i = |λ_i| / Σ |λ_i|
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.abs(eigenvalues[i]);

  let entropy = 0;
  if (total > 0) {
    for (let i = 0; i < n; i++) {
      const p = Math.abs(eigenvalues[i]) / total;
      if (p > 0) entropy -= p * Math.log(p);
    }
  }

  // Effective dimension: exp(entropy) (perplexity)
  const effectiveDimension = Math.exp(entropy);

  // Gap profile: consecutive eigenvalue differences
  const gapProfile: number[] = [];
  for (let i = 1; i < n; i++) {
    gapProfile.push(eigenvalues[i] - eigenvalues[i - 1]);
  }

  return {
    eigenvalueHistogram: histogram,
    spectralEntropy: entropy,
    effectiveDimension,
    gapProfile,
    conservationProfile: [], // filled by caller
  };
}

/**
 * Compare two spectral fingerprints.
 * Returns a similarity score in [0, 1] where 1 = identical.
 */
export function compareFingerprints(
  a: SpectralFingerprint,
  b: SpectralFingerprint
): number {
  // Normalize histograms to same length
  const maxLen = Math.max(
    a.eigenvalueHistogram.length,
    b.eigenvalueHistogram.length
  );
  const normA = normalizeHistogram(a.eigenvalueHistogram, maxLen);
  const normB = normalizeHistogram(b.eigenvalueHistogram, maxLen);

  // Histogram similarity (cosine)
  let dot = 0;
  let normA2 = 0;
  let normB2 = 0;
  for (let i = 0; i < maxLen; i++) {
    dot += normA[i] * normB[i];
    normA2 += normA[i] ** 2;
    normB2 += normB[i] ** 2;
  }
  const histSim =
    normA2 > 0 && normB2 > 0 ? dot / (Math.sqrt(normA2) * Math.sqrt(normB2)) : 0;

  // Entropy similarity
  const entDiff = Math.abs(a.spectralEntropy - b.spectralEntropy);
  const entSim = Math.exp(-entDiff);

  // Effective dimension similarity
  const dimDiff = Math.abs(a.effectiveDimension - b.effectiveDimension);
  const dimMax = Math.max(a.effectiveDimension, b.effectiveDimension, 1);
  const dimSim = 1 - dimDiff / dimMax;

  // Weighted combination
  return 0.4 * histSim + 0.3 * entSim + 0.3 * dimSim;
}

function normalizeHistogram(h: number[], targetLen: number): number[] {
  const sum = h.reduce((a, b) => a + b, 0) || 1;
  const norm = h.map((v) => v / sum);
  if (norm.length >= targetLen) return norm.slice(0, targetLen);
  return [...norm, ...new Array(targetLen - norm.length).fill(0)];
}
