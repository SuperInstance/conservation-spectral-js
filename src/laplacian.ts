/**
 * Laplacian construction — flat Float64Array storage
 */

import type { Laplacian, LaplacianType } from "./types";

/**
 * Build a Laplacian from a flat row-major weight/transition matrix.
 *
 * @param transitions  flat row-major n×n Float64Array
 * @param n            matrix dimension
 * @param similarityKernel  optional (i,j)→number; defaults to 1.0
 * @param type         Laplacian variant
 */
export function buildLaplacian(
  transitions: Float64Array,
  n: number,
  similarityKernel?: (i: number, j: number) => number,
  type: LaplacianType = "unnormalized"
): Laplacian {
  const kernel = similarityKernel ?? (() => 1.0);

  // Build weighted adjacency W
  const W = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      W[i * n + j] = transitions[i * n + j] * kernel(i, j);
    }
  }

  // Degree vector
  const degrees = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) d += W[i * n + j];
    degrees[i] = d;
  }

  // Degree matrix (flat)
  const D = new Float64Array(n * n);
  for (let i = 0; i < n; i++) D[i * n + i] = degrees[i];

  const L = new Float64Array(n * n);

  if (type === "unnormalized") {
    // L = D - W
    for (let i = 0; i < n * n; i++) L[i] = D[i] - W[i];
  } else if (type === "symmetric_normalized") {
    // L_norm = I - D^{-1/2} W D^{-1/2}
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          L[i * n + i] = degrees[i] > 0 ? 1 : 0;
        } else {
          const di = Math.sqrt(degrees[i]);
          const dj = Math.sqrt(degrees[j]);
          if (di > 0 && dj > 0) {
            L[i * n + j] = -W[i * n + j] / (di * dj);
          }
        }
      }
    }
  } else {
    // random_walk_normalized: L_rw = I - D^{-1} W
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          L[i * n + i] = degrees[i] > 0 ? 1 : 0;
        } else {
          if (degrees[i] > 0) {
            L[i * n + j] = -W[i * n + j] / degrees[i];
          }
        }
      }
    }
  }

  return {
    matrix: L,
    degreeMatrix: D,
    weightMatrix: W,
    degrees,
    normalized: type !== "unnormalized",
    numVertices: n,
  };
}
