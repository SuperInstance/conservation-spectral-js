import { describe, it, expect } from "vitest";
import {
  createGraph,
  addVertex,
  addEdge,
  addAttribute,
  adjacencyMatrix,
  vertexCount,
  edgeCount,
  buildTransitionMatrix,
} from "../src/graph";

describe("TensionGraph", () => {
  it("creates an empty directed graph", () => {
    const g = createGraph<string>(true);
    expect(vertexCount(g)).toBe(0);
    expect(edgeCount(g)).toBe(0);
  });

  it("adds vertices and edges", () => {
    const g = createGraph<string>(true);
    addVertex(g, "A");
    addVertex(g, "B");
    addVertex(g, "C");
    addEdge(g, "A", "B", 1.0);
    addEdge(g, "B", "C", 2.0);
    addEdge(g, "A", "C", 0.5);

    expect(vertexCount(g)).toBe(3);
    expect(edgeCount(g)).toBe(3);

    const adj = adjacencyMatrix(g);
    expect(adj[0 * 3 + 1]).toBe(1.0); // A→B
    expect(adj[1 * 3 + 2]).toBe(2.0); // B→C
    expect(adj[0 * 3 + 2]).toBe(0.5); // A→C
  });

  it("handles undirected edges", () => {
    const g = createGraph<string>(false);
    addVertex(g, "X");
    addVertex(g, "Y");
    addEdge(g, "X", "Y", 3.0);

    expect(edgeCount(g)).toBe(1);
    const adj = adjacencyMatrix(g);
    expect(adj[0 * 2 + 1]).toBe(3.0);
    expect(adj[1 * 2 + 0]).toBe(3.0);
  });

  it("stores vertex attributes", () => {
    const g = createGraph<string>(true);
    addVertex(g, "A");
    addVertex(g, "B");
    addVertex(g, "C");
    addAttribute(g, "weight", new Float64Array([1.0, 2.0, 3.0]));

    const attr = g.attributes.get("weight")!;
    expect(attr).toBeDefined();
    expect(attr.length).toBe(3);
    expect(attr[1]).toBe(2.0);
  });

  it("builds a transition matrix from a vertex sequence", () => {
    const g = createGraph<string>(true);
    addVertex(g, "A");
    addVertex(g, "B");
    addVertex(g, "C");
    addEdge(g, "A", "B", 1);
    addEdge(g, "B", "C", 1);

    const seq = ["A", "B", "C", "A", "B", "C"];
    const T = buildTransitionMatrix(g, seq);
    const n = 3;

    // Rows should sum to ~1
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) rowSum += T[i * n + j];
      expect(rowSum).toBeCloseTo(1.0, 6);
    }

    // A→B should be high
    expect(T[0 * n + 1]).toBeGreaterThan(T[0 * n + 2]);
  });

  it("throws on invalid attribute length", () => {
    const g = createGraph<string>(true);
    addVertex(g, "A");
    addVertex(g, "B");
    expect(() => addAttribute(g, "x", new Float64Array([1, 2, 3]))).toThrow();
  });
});
