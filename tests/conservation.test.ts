import { describe, it, expect } from "vitest";
import {
  analyze,
  conservationRatio,
  conservationRatios,
  spectralGap,
  cheegerConstant,
} from "../src/conservation";
import { buildLaplacian } from "../src/laplacian";
import { eigendecompose } from "../src/eigen";
import { jacobiEigen } from "../src/eigen";

describe("conservationRatio", () => {
  it("returns non-negative ratio", () => {
    const n = 4;
    // Simple chain graph Laplacian
    const W = new Float64Array(n * n);
    W[0 * 4 + 1] = 1; W[1 * 4 + 0] = 1;
    W[1 * 4 + 2] = 1; W[2 * 4 + 1] = 1;
    W[2 * 4 + 3] = 1; W[3 * 4 + 2] = 1;

    const lap = buildLaplacian(W, n, undefined, "unnormalized");
    const eigen = jacobiEigen(lap.matrix, n, 1000);
    const attr = new Float64Array([1, 2, 3, 4]);

    for (let k = 0; k < n; k++) {
      const cr = conservationRatio(eigen.values, eigen.vectors, attr, k);
      expect(cr).toBeGreaterThanOrEqual(-1e-10);
    }
  });
});

describe("conservationRatios", () => {
  it("returns one ratio per eigenvector", () => {
    const n = 3;
    const W = new Float64Array([0, 1, 0.5, 1, 0, 1, 0.5, 1, 0]);
    const lap = buildLaplacian(W, n);
    const eigen = jacobiEigen(lap.matrix, n);
    const attr = new Float64Array([1, 2, 3]);
    const ratios = conservationRatios(eigen.values, eigen.vectors, attr, "test");

    expect(ratios.length).toBe(n);
    expect(ratios[0].attributeName).toBe("test");
  });
});

describe("spectralGap", () => {
  it("computes the largest eigenvalue gap", () => {
    const vals = new Float64Array([0, 0.5, 1.0, 4.0]);
    expect(spectralGap(vals)).toBeCloseTo(3.0, 6);
  });

  it("returns 0 for single eigenvalue", () => {
    expect(spectralGap(new Float64Array([1]))).toBe(0);
  });
});

describe("cheegerConstant", () => {
  it("returns a positive constant for a connected graph", () => {
    const n = 4;
    const W = new Float64Array(n * n);
    // Cycle graph
    W[0 * 4 + 1] = 1; W[1 * 4 + 0] = 1;
    W[1 * 4 + 2] = 1; W[2 * 4 + 1] = 1;
    W[2 * 4 + 3] = 1; W[3 * 4 + 2] = 1;
    W[3 * 4 + 0] = 1; W[0 * 4 + 3] = 1;

    const lap = buildLaplacian(W, n);
    const eigen = jacobiEigen(lap.matrix, n, 1000);
    const fiedler = eigen.vectors[1];

    const h = cheegerConstant(W, lap.degrees, fiedler, n);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(1);
  });
});

describe("analyze", () => {
  it("produces a full conservation report", () => {
    const n = 5;
    // Cycle graph transitions
    const T = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      T[i * n + (i + 1) % n] = 0.5;
      T[i * n + (i - 1 + n) % n] = 0.5;
    }

    const attr = new Float64Array([1, 2, 3, 4, 5]);
    const report = analyze(T, n, attr, "magnitude");

    expect(report.ratios.length).toBe(n);
    expect(report.spectralGap).toBeGreaterThan(0);
    expect(report.cheegerConstant).toBeGreaterThanOrEqual(0);
    expect(report.fingerprint).toBeDefined();
    expect(report.fingerprint.gapProfile.length).toBe(n - 1);
    expect(report.fingerprint.spectralEntropy).toBeGreaterThanOrEqual(0);
  });

  it("musical chord progression: C→G→Am→F→Dm", () => {
    // Chords as vertices, transitions based on common progressions
    const chords = ["C", "G", "Am", "F", "Dm"];
    const n = chords.length;

    // Weighted transitions (common in pop music)
    const T = new Float64Array(n * n);
    // C→G (strong), C→Am, C→F
    T[0 * n + 1] = 0.5; T[0 * n + 2] = 0.2; T[0 * n + 3] = 0.3;
    // G→C (strong), G→Am
    T[1 * n + 0] = 0.6; T[1 * n + 2] = 0.4;
    // Am→F (strong), Am→Dm
    T[2 * n + 3] = 0.5; T[2 * n + 4] = 0.5;
    // F→C, F→G, F→Dm
    T[3 * n + 0] = 0.3; T[3 * n + 1] = 0.2; T[3 * n + 4] = 0.5;
    // Dm→Am, Dm→F, Dm→G
    T[4 * n + 2] = 0.3; T[4 * n + 3] = 0.4; T[4 * n + 1] = 0.3;

    // Attribute: "brightness" — major chords higher
    const brightness = new Float64Array([1.0, 0.9, 0.3, 0.7, 0.2]);

    const report = analyze(T, n, brightness, "brightness");

    expect(report.ratios.length).toBe(n);
    expect(report.spectralGap).toBeGreaterThan(0);
    // The report should be complete
    expect(report.fingerprint.eigenvalueHistogram.length).toBeGreaterThan(0);
  });
});
