/**
 * TensionGraph<V> — weighted graph with vertex attributes
 */

import type { TensionGraph, Edge } from "./types";

export function createGraph<V>(directed = true): TensionGraph<V> {
  return {
    vertices: [],
    vertexIndex: new Map(),
    adjacency: [],
    attributes: new Map(),
    directed,
  };
}

export function addVertex<V>(g: TensionGraph<V>, v: V): number {
  const idx = g.vertices.length;
  g.vertices.push(v);
  g.vertexIndex.set(v, idx);
  g.adjacency.push([]);
  return idx;
}

export function addEdge<V>(g: TensionGraph<V>, source: V, target: V, weight: number): void {
  const si = g.vertexIndex.get(source);
  const ti = g.vertexIndex.get(target);
  if (si === undefined) throw new Error(`Unknown vertex: ${String(source)}`);
  if (ti === undefined) throw new Error(`Unknown vertex: ${String(target)}`);
  g.adjacency[si].push([ti, weight]);
  if (!g.directed) {
    g.adjacency[ti].push([si, weight]);
  }
}

export function addAttribute<V>(g: TensionGraph<V>, name: string, values: Float64Array): void {
  if (values.length !== g.vertices.length) {
    throw new Error(
      `Attribute length ${values.length} != vertex count ${g.vertices.length}`
    );
  }
  g.attributes.set(name, new Float64Array(values));
}

export function vertexCount<V>(g: TensionGraph<V>): number {
  return g.vertices.length;
}

export function edgeCount<V>(g: TensionGraph<V>): number {
  let count = 0;
  for (const adj of g.adjacency) count += adj.length;
  if (!g.directed) return count / 2;
  return count;
}

/**
 * Build flat row-major adjacency matrix (Float64Array, n×n).
 */
export function adjacencyMatrix<V>(g: TensionGraph<V>): Float64Array {
  const n = g.vertices.length;
  const mat = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (const [j, w] of g.adjacency[i]) {
      mat[i * n + j] += w;
    }
  }
  return mat;
}

/**
 * Build a flat row-major transition probability matrix from a sequence of vertices.
 * Rows are normalized to sum to 1 with smoothing.
 */
export function buildTransitionMatrix<V>(
  g: TensionGraph<V>,
  sequence: V[],
  smoothing = 0.01
): Float64Array {
  const n = g.vertices.length;
  const T = new Float64Array(n * n);

  // Initialize with smoothing
  for (let i = 0; i < n * n; i++) T[i] = smoothing;

  // Count transitions
  for (let s = 0; s < sequence.length - 1; s++) {
    const a = g.vertexIndex.get(sequence[s]);
    const b = g.vertexIndex.get(sequence[s + 1]);
    if (a !== undefined && b !== undefined) {
      T[a * n + b] += 1;
    }
  }

  // Normalize rows
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) rowSum += T[i * n + j];
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) T[i * n + j] /= rowSum;
    }
  }

  return T;
}
