import { describe, it, expect } from "vitest";
import { jacobiEigen, lanczosEigen, eigendecompose } from "../src/eigen";

describe("Jacobi eigensolver", () => {
  it("solves a 2×2 symmetric matrix", () => {
    // [[2, 1], [1, 3]] → eigenvalues ≈ 1.382, 3.618
    const A = new Float64Array([2, 1, 1, 3]);
    const result = jacobiEigen(A, 2, 100);

    expect(result.values.length).toBe(2);
    expect(result.vectors.length).toBe(2);
    // eigenvalues of [[2,1],[1,3]] are (5 ± √5) / 2
    expect(result.values[0]).toBeCloseTo((5 - Math.sqrt(5)) / 2, 6);
    expect(result.values[1]).toBeCloseTo((5 + Math.sqrt(5)) / 2, 6);
  });

  it("solves a 3×3 diagonal matrix", () => {
    // diag(1, 3, 5) → eigenvalues 1, 3, 5
    const A = new Float64Array([1, 0, 0, 0, 3, 0, 0, 0, 5]);
    const result = jacobiEigen(A, 3, 100);

    expect(result.values[0]).toBeCloseTo(1, 6);
    expect(result.values[1]).toBeCloseTo(3, 6);
    expect(result.values[2]).toBeCloseTo(5, 6);
  });

  it("eigenvectors are orthonormal", () => {
    // Random symmetric 4×4
    const n = 4;
    const raw = [
      [4, 1, 0, 0],
      [1, 3, 1, 0],
      [0, 1, 2, 1],
      [0, 0, 1, 1],
    ];
    const A = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) A[i * n + j] = raw[i][j];

    const result = jacobiEigen(A, n, 1000);

    // Check orthonormality: V^T V ≈ I
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let dot = 0;
        for (let k = 0; k < n; k++) dot += result.vectors[i][k] * result.vectors[j][k];
        if (i === j) {
          expect(dot).toBeCloseTo(1, 6);
        } else {
          expect(dot).toBeCloseTo(0, 6);
        }
      }
    }
  });

  it("eigenvalues are non-negative for a Laplacian", () => {
    // Chain graph: 0-1-2-3
    const n = 4;
    const L = new Float64Array(n * n);
    L[0 * 4 + 0] = 1; L[0 * 4 + 1] = -1;
    L[1 * 4 + 0] = -1; L[1 * 4 + 1] = 2; L[1 * 4 + 2] = -1;
    L[2 * 4 + 1] = -1; L[2 * 4 + 2] = 2; L[2 * 4 + 3] = -1;
    L[3 * 4 + 2] = -1; L[3 * 4 + 3] = 1;

    const result = jacobiEigen(L, n, 1000);
    for (let i = 0; i < n; i++) {
      expect(result.values[i]).toBeGreaterThanOrEqual(-1e-10);
    }
    // Smallest eigenvalue should be ~0
    expect(result.values[0]).toBeCloseTo(0, 6);
  });
});

describe("Lanczos eigensolver", () => {
  it("finds smallest eigenvalues of a symmetric matrix", () => {
    const n = 6;
    // Tridiagonal matrix
    const A = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      A[i * n + i] = 2;
      if (i > 0) A[i * n + (i - 1)] = -1;
      if (i < n - 1) A[i * n + (i + 1)] = -1;
    }

    const result = lanczosEigen(A, n, 3);
    expect(result.values.length).toBe(3);

    // All should be non-negative
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("works with a matrix-vector product function", () => {
    const n = 5;
    const diag = new Float64Array([1, 2, 3, 4, 5]);
    const matVec = (x: Float64Array): Float64Array => {
      const y = new Float64Array(n);
      for (let i = 0; i < n; i++) y[i] = diag[i] * x[i];
      return y;
    };

    const result = lanczosEigen(matVec, n, 3);
    expect(result.values[0]).toBeCloseTo(1, 3);
    expect(result.values[1]).toBeCloseTo(2, 3);
    expect(result.values[2]).toBeCloseTo(3, 3);
  });
});

describe("eigendecompose convenience function", () => {
  it("delegates to Jacobi for small matrices", () => {
    const n = 4;
    const L = new Float64Array(n * n);
    L[0] = 1; L[1] = -1;
    L[4] = -1; L[5] = 2; L[6] = -1;
    L[9] = -1; L[10] = 2; L[11] = -1;
    L[14] = -1; L[15] = 1;

    const result = eigendecompose(L, n, 0, "unnormalized");
    expect(result.values[0]).toBeCloseTo(0, 6);
    expect(result.laplacianType).toBe("unnormalized");
  });
});
