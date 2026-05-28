import { describe, it, expect } from "vitest";
import { ConservationTracker } from "../src/tracker";
import { jacobiEigen } from "../src/eigen";
import { buildLaplacian } from "../src/laplacian";

describe("ConservationTracker", () => {
  function makeTracker(sequence: string[]) {
    // Build a small graph from unique labels
    const unique = [...new Set(sequence)];
    const n = unique.length;
    const indexMap: Record<string, number> = {};
    unique.forEach((label, i) => (indexMap[label] = i));

    // Build transition weights
    const W = new Float64Array(n * n);
    for (let s = 0; s < sequence.length - 1; s++) {
      const a = indexMap[sequence[s]];
      const b = indexMap[sequence[s + 1]];
      W[a * n + b] += 1;
      W[b * n + a] += 1;
    }

    const lap = buildLaplacian(W, n);
    const eigen = jacobiEigen(lap.matrix, n, 1000);

    return new ConservationTracker(
      eigen.vectors,
      indexMap,
      10,
      Math.min(3, n)
    );
  }

  it("starts without anomaly for normal sequences", () => {
    const tracker = makeTracker(["A", "B", "C", "A", "B", "C"]);

    // Feed a normal sequence
    const normal = ["A", "B", "C", "A", "B", "C", "A", "B", "C"];
    let hadAnomaly = false;
    for (const label of normal) {
      const result = tracker.feed(label);
      if (result.isAnomaly) hadAnomaly = true;
    }
    // Should not flag normal repeating pattern
    expect(hadAnomaly).toBe(false);
  });

  it("establishes baseline after enough observations", () => {
    const tracker = makeTracker(["A", "B", "C", "D", "E"]);

    // Feed enough to establish baseline
    for (let i = 0; i < 15; i++) {
      tracker.feed(["A", "B", "C", "D", "E"][i % 5]);
    }

    const report = tracker.report();
    expect(report.baseline).not.toBeNull();
  });

  it("suggests corrections based on eigenspace proximity", () => {
    const tracker = makeTracker(["A", "B", "C", "A", "B", "C"]);

    // Feed some context
    tracker.feed("A");
    tracker.feed("B");

    const suggestion = tracker.suggestCorrection("X", ["A", "B"]);
    // Should suggest one of the known labels
    expect(["A", "B", "C"]).toContain(suggestion.suggestedLabel);
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
  });

  it("reset clears all state", () => {
    const tracker = makeTracker(["A", "B", "C"]);

    tracker.feed("A");
    tracker.feed("B");
    tracker.feed("C");
    tracker.reset();

    const report = tracker.report();
    expect(report.baseline).toBeNull();
    expect(report.currentScore).toBe(0);
  });

  it("report returns meaningful data", () => {
    const tracker = makeTracker(["X", "Y", "Z"]);
    tracker.feed("X");
    tracker.feed("Y");
    tracker.feed("Z");

    const report = tracker.report();
    expect(report.windowSize).toBe(10);
    expect(report.numComponents).toBe(3);
    expect(typeof report.currentScore).toBe("number");
  });

  it("token transition analysis on code snippets", () => {
    // Simulate token types from a JavaScript snippet
    const jsTokens = [
      "keyword", "identifier", "punctuation", "identifier",
      "operator", "number", "punctuation",
      "keyword", "identifier", "punctuation",
      "string", "punctuation",
      "keyword", "identifier",
    ];

    const unique = [...new Set(jsTokens)];
    const n = unique.length;
    const indexMap: Record<string, number> = {};
    unique.forEach((t, i) => (indexMap[t] = i));

    // Build transition matrix
    const W = new Float64Array(n * n);
    for (let i = 0; i < jsTokens.length - 1; i++) {
      const a = indexMap[jsTokens[i]];
      const b = indexMap[jsTokens[i + 1]];
      W[a * n + b] += 1;
      W[b * n + a] += 1;
    }

    const lap = buildLaplacian(W, n);
    const eigen = jacobiEigen(lap.matrix, n, 1000);
    const tracker = new ConservationTracker(eigen.vectors, indexMap, 8, 3);

    // Feed the normal sequence
    for (const tok of jsTokens) {
      tracker.feed(tok);
    }

    // Should have established baseline
    expect(tracker.getBaseline()).not.toBeNull();

    // Now feed an anomalous injection (unexpected pattern)
    const result = tracker.feed("string"); // might trigger
    expect(typeof result.isAnomaly).toBe("boolean");
    expect(typeof result.score).toBe("number");
  });
});
