/**
 * Anomaly detection and correction suggestions
 */

import type { Anomaly, AnomalyType, ConservationRatio, Fix } from "./types";

/**
 * Detect anomalies from conservation ratios.
 * Uses z-score based detection: vertices where local conservation
 * deviates significantly from the global pattern.
 */
export function detectAnomalies(
  ratios: ConservationRatio[],
  eigenvalues: Float64Array,
  eigenvectors: Float64Array[],
  attribute: Float64Array,
  threshold = 3.0
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const n = attribute.length;

  if (n === 0 || eigenvectors.length === 0) return anomalies;

  // Compute per-vertex deviations for the first few eigenvectors
  const numComponents = Math.min(5, eigenvectors.length);

  for (let k = 1; k < numComponents; k++) {
    const phi = eigenvectors[k];

    // Compute per-vertex contribution to gradient variance
    const contributions = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      contributions[i] = Math.abs(attribute[i] * phi[i]);
    }

    // Mean and std of contributions
    let mean = 0;
    for (let i = 0; i < n; i++) mean += contributions[i];
    mean /= n;

    let std = 0;
    for (let i = 0; i < n; i++) std += (contributions[i] - mean) ** 2;
    std = Math.sqrt(std / n);

    if (std === 0) continue;

    for (let i = 0; i < n; i++) {
      const zScore = (contributions[i] - mean) / std;
      if (Math.abs(zScore) > threshold) {
        let anomalyType: AnomalyType;
        if (k === 1) {
          anomalyType = "conservation_violation";
        } else if (zScore > 0) {
          anomalyType = "spectral_outlier";
        } else {
          anomalyType = "structural_break";
        }

        anomalies.push({
          vertexId: i,
          eigenvectorIndex: k,
          deviation: zScore,
          anomalyType,
          description: `Vertex ${i} has z-score ${zScore.toFixed(3)} in eigenvector ${k} (eigenvalue ${eigenvalues[k].toFixed(6)})`,
        });
      }
    }
  }

  return anomalies;
}

/**
 * Suggest a correction for a detected anomaly.
 * Looks at the eigenspace to find the nearest "well-behaved" position.
 */
export function suggestCorrection(
  eigenvalues: Float64Array,
  eigenvectors: Float64Array[],
  anomaly: Anomaly,
  attribute: Float64Array,
  adjacency: Float64Array,
  n: number
): Fix {
  const v = anomaly.vertexId;
  const k = anomaly.eigenvectorIndex;

  if (v >= n || k >= eigenvectors.length) {
    return { description: "Cannot suggest correction: indices out of range", confidence: 0 };
  }

  // Find neighbors of the anomalous vertex
  const neighbors: number[] = [];
  for (let j = 0; j < n; j++) {
    if (adjacency[v * n + j] > 0 || adjacency[j * n + v] > 0) {
      neighbors.push(j);
    }
  }

  if (neighbors.length === 0) {
    return {
      vertex: v,
      description: `Isolated vertex ${v}: no neighbors to suggest edge corrections`,
      confidence: 0,
    };
  }

  // Compute average neighbor value in eigenspace
  const phi = eigenvectors[k];
  let neighborAvg = 0;
  for (const j of neighbors) {
    neighborAvg += attribute[j] * phi[j];
  }
  neighborAvg /= neighbors.length;

  const currentValue = attribute[v] * phi[v];
  const deviation = Math.abs(currentValue - neighborAvg);

  // Find the neighbor most similar in eigenspace
  let bestNeighbor = neighbors[0];
  let bestDiff = Infinity;
  for (const j of neighbors) {
    const diff = Math.abs(attribute[j] * phi[j] - neighborAvg);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestNeighbor = j;
    }
  }

  // Suggest adjusting edge weight to pull vertex toward the cluster
  const suggestedWeight = 1.0 + deviation;
  const confidence = Math.min(1, 1 / (1 + deviation));

  return {
    edge: [v, bestNeighbor],
    vertex: v,
    suggestedWeight,
    description: `Increase weight on edge (${v}, ${bestNeighbor}) to ${suggestedWeight.toFixed(4)} — pulls vertex ${v} toward its spectral cluster`,
    confidence,
  };
}
