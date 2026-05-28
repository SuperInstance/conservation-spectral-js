/**
 * Eigensolvers — Jacobi (dense) and Lanczos (sparse/large)
 */

import type { EigenResult, LaplacianType } from "./types";

// ── Jacobi (ported from moo-spectral.js, upgraded to flat Float64Array) ──

/**
 * Jacobi eigenvalue algorithm for symmetric matrices.
 * Works well for dense matrices up to ~50×50.
 *
 * Input: flat row-major n×n Float64Array (must be symmetric).
 * Output: eigenvalues sorted ascending, eigenvectors as Float64Array[].
 */
export function jacobiEigen(
  A: Float64Array,
  n: number,
  maxIter = 1000
): EigenResult {
  // Working copy (2D for readability during rotation)
  const S: number[][] = [];
  for (let i = 0; i < n; i++) {
    S[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      S[i][j] = A[i * n + j];
    }
  }

  // Eigenvector matrix V = I
  const V: number[][] = [];
  for (let i = 0; i < n; i++) {
    V[i] = new Array(n).fill(0);
    V[i][i] = 1;
  }

  const tol = 1e-12;

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tol) break;

    // Compute rotation angle
    const app = S[p][p];
    const aqq = S[q][q];
    const apq = S[p][q];
    let theta: number;
    if (Math.abs(app - aqq) < 1e-15) {
      theta = Math.PI / 4;
    } else {
      theta = 0.5 * Math.atan2(2 * apq, app - aqq);
    }
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply Givens rotation: S' = G^T S G
    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const sip = S[i][p];
      const siq = S[i][q];
      S[i][p] = c * sip + s * siq;
      S[p][i] = S[i][p];
      S[i][q] = -s * sip + c * siq;
      S[q][i] = S[i][q];
    }
    const spp = S[p][p];
    const sqq = S[q][q];
    S[p][p] = c * c * spp + 2 * s * c * apq + s * s * sqq;
    S[q][q] = s * s * spp - 2 * s * c * apq + c * c * sqq;
    S[p][q] = 0;
    S[q][p] = 0;

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip + s * viq;
      V[i][q] = -s * vip + c * viq;
    }
  }

  // Extract eigenvalues
  const evals: number[] = new Array(n);
  for (let i = 0; i < n; i++) evals[i] = S[i][i];

  // Sort ascending
  const indices = evals.map((_, i) => i);
  indices.sort((a, b) => evals[a] - evals[b]);

  const sortedEvals = new Float64Array(n);
  const sortedEvecs: Float64Array[] = [];
  for (let k = 0; k < n; k++) sortedEvecs[k] = new Float64Array(n);

  for (let k = 0; k < n; k++) {
    const idx = indices[k];
    sortedEvals[k] = evals[idx];
    for (let i = 0; i < n; i++) {
      sortedEvecs[k][i] = V[i][idx];
    }
  }

  return { values: sortedEvals, vectors: sortedEvecs, laplacianType: "unnormalized" as LaplacianType };
}

// ── Lanczos (NEW — for sparse/large matrices) ─────────────

/**
 * Lanczos algorithm for symmetric matrices.
 * Finds the `numVectors` smallest eigenvalues/eigenvectors.
 * Much more efficient than Jacobi for large sparse matrices.
 *
 * Input: flat row-major n×n symmetric matrix, or a matrix-vector product function.
 */
export function lanczosEigen(
  A: Float64Array | ((x: Float64Array) => Float64Array),
  n: number,
  numVectors: number,
  maxIter?: number
): EigenResult {
  const k = Math.min(numVectors, n);
  const maxK = maxIter ?? Math.min(n, Math.max(k + 10, 2 * k));

  // Matrix-vector product
  const matVec =
    typeof A === "function"
      ? A
      : (x: Float64Array): Float64Array => {
          const y = new Float64Array(n);
          for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
              sum += A[i * n + j] * x[j];
            }
            y[i] = sum;
          }
          return y;
        };

  // Lanczos vectors
  const Q: Float64Array[] = [];
  const alpha: number[] = [];
  const beta: number[] = [];

  // q0 = random, normalized
  let q = new Float64Array(n);
  for (let i = 0; i < n; i++) q[i] = Math.random() - 0.5;
  let norm = Math.sqrt(dot(q, q));
  if (norm === 0) { q[0] = 1; norm = 1; }
  for (let i = 0; i < n; i++) q[i] /= norm;
  Q.push(new Float64Array(q));

  let r = matVec(q);
  alpha.push(dot(q, r));
  for (let i = 0; i < n; i++) r[i] -= alpha[0] * q[i];

  for (let j = 1; j < maxK; j++) {
    const b = Math.sqrt(dot(r, r));
    beta.push(b);

    if (b < 1e-14) break; // Invariant subspace found

    const qNew = new Float64Array(n);
    for (let i = 0; i < n; i++) qNew[i] = r[i] / b;

    // Reorthogonalize (full reorthogonalization for numerical stability)
    for (let iter = 0; iter < 2; iter++) {
      for (let l = 0; l < j; l++) {
        const d = dot(Q[l], qNew);
        for (let i = 0; i < n; i++) qNew[i] -= d * Q[l][i];
      }
    }

    norm = Math.sqrt(dot(qNew, qNew));
    if (norm === 0) break;
    for (let i = 0; i < n; i++) qNew[i] /= norm;

    Q.push(new Float64Array(qNew));

    r = matVec(qNew);
    const a = dot(qNew, r);
    alpha.push(a);

    for (let i = 0; i < n; i++) {
      r[i] = r[i] - a * qNew[i] - b * Q[j - 1][i];
    }
  }

  const m = alpha.length; // actual Lanczos dimension

  // Solve tridiagonal eigenproblem using Jacobi on the m×m tridiagonal matrix
  if (m === 0) {
    return { values: new Float64Array(0), vectors: [], laplacianType: "unnormalized" };
  }

  // Build tridiagonal as full m×m matrix for Jacobi
  const T = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    T[i * m + i] = alpha[i];
    if (i < m - 1) {
      T[i * m + (i + 1)] = beta[i];
      T[(i + 1) * m + i] = beta[i];
    }
  }

  // Use Jacobi on the small tridiagonal matrix
  const smallEigen = jacobiEigen(T, m, m * m * 10);

  // Take only the k smallest
  const actualK = Math.min(k, m);
  const values = new Float64Array(actualK);
  const vectors: Float64Array[] = [];

  for (let i = 0; i < actualK; i++) {
    values[i] = smallEigen.values[i];
    // Convert from Lanczos basis to original basis
    const v = new Float64Array(n);
    for (let j = 0; j < m; j++) {
      const coeff = smallEigen.vectors[i][j];
      for (let l = 0; l < n; l++) {
        v[l] += coeff * Q[j][l];
      }
    }
    // Normalize
    const vNorm = Math.sqrt(dot(v, v));
    if (vNorm > 0) {
      for (let l = 0; l < n; l++) v[l] /= vNorm;
    }
    vectors.push(v);
  }

  return { values, vectors, laplacianType: "unnormalized" };
}

// ── Helpers ───────────────────────────────────────────────

function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) s += a[i] * b[i];
  return s;
}

/**
 * Convenience: eigendecompose a Laplacian.
 * Uses Jacobi for small matrices, Lanczos for larger ones.
 */
export function eigendecompose(
  lapMatrix: Float64Array,
  n: number,
  numVectors = 0,
  laplacianType: LaplacianType = "unnormalized"
): EigenResult {
  const k = numVectors > 0 ? numVectors : n;
  let result: EigenResult;

  if (n <= 50) {
    result = jacobiEigen(lapMatrix, n, n * n * 10);
  } else {
    result = lanczosEigen(lapMatrix, n, k);
  }

  result.laplacianType = laplacianType;
  return result;
}
