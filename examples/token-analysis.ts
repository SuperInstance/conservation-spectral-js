/**
 * Example: Token transition analysis using Conservation Spectral SDK
 *
 * Analyzes token type transitions in code snippets to find
 * structural patterns and anomalies.
 */

import {
  createGraph,
  addVertex,
  addEdge,
  addAttribute,
  adjacencyMatrix,
} from "../src/graph";
import { buildLaplacian } from "../src/laplacian";
import { eigendecompose } from "../src/eigen";
import { analyze } from "../src/conservation";
import { spectralFingerprint, compareFingerprints } from "../src/fingerprint";
import { ConservationTracker } from "../src/tracker";

// ── Example 1: Analyze a JavaScript code snippet ──────────

const jsCode = `
function hello(name) {
  return "Hello, " + name + "!";
}
`;

// Simplified token types (would come from a real lexer)
const jsTokens = [
  "keyword", "identifier", "punctuation", "identifier", "punctuation",
  "punctuation", "keyword", "string", "operator", "identifier", "operator",
  "string", "punctuation", "punctuation",
];

console.log("=== JavaScript Token Analysis ===");

// Build graph from unique token types
const uniqueTypes = [...new Set(jsTokens)];
const n = uniqueTypes.length;

const g = createGraph<string>(true);
for (const t of uniqueTypes) addVertex(g, t);

// Count transitions as edges
for (let i = 0; i < jsTokens.length - 1; i++) {
  addEdge(g, jsTokens[i], jsTokens[i + 1], 1.0);
}

// Build transition matrix
const adj = adjacencyMatrix(g);
const T = new Float64Array(n * n);
for (let i = 0; i < n * n; i++) T[i] = adj[i];
// Normalize rows
for (let i = 0; i < n; i++) {
  let sum = 0;
  for (let j = 0; j < n; j++) sum += T[i * n + j];
  if (sum > 0) for (let j = 0; j < n; j++) T[i * n + j] /= sum;
}

// Attribute: token complexity (arbitrary ranking)
const complexity = new Float64Array(n);
uniqueTypes.forEach((t, i) => {
  complexity[i] = t === "keyword" ? 1.0 : t === "identifier" ? 0.5 : t === "string" ? 0.7 : 0.2;
});
addAttribute(g, "complexity", complexity);

const report = analyze(T, n, complexity, "complexity");
console.log("Spectral gap:", report.spectralGap.toFixed(6));
console.log("Cheeger constant:", report.cheegerConstant.toFixed(6));
console.log("Spectral entropy:", report.fingerprint.spectralEntropy.toFixed(6));
console.log("Effective dimension:", report.fingerprint.effectiveDimension.toFixed(2));
console.log("Anomalies found:", report.anomalies.length);

// ── Example 2: Compare Python vs JavaScript fingerprints ──

console.log("\n=== Language Comparison ===");

// Python tokens for similar code
const pyTokens = [
  "keyword", "identifier", "punctuation", "identifier", "punctuation",
  "keyword", "string", "operator", "identifier", "operator", "string",
];

const pyUnique = [...new Set(pyTokens)];
const pn = pyUnique.length;

const pg = createGraph<string>(true);
for (const t of pyUnique) addVertex(pg, t);
for (let i = 0; i < pyTokens.length - 1; i++) addEdge(pg, pyTokens[i], pyTokens[i + 1], 1.0);

const pAdj = adjacencyMatrix(pg);
const PT = new Float64Array(pn * pn);
for (let i = 0; i < pn * pn; i++) PT[i] = pAdj[i];
for (let i = 0; i < pn; i++) {
  let sum = 0;
  for (let j = 0; j < pn; j++) sum += PT[i * pn + j];
  if (sum > 0) for (let j = 0; j < pn; j++) PT[i * pn + j] /= sum;
}

const pyComplexity = new Float64Array(pn);
pyUnique.forEach((t, i) => {
  pyComplexity[i] = t === "keyword" ? 1.0 : t === "identifier" ? 0.5 : t === "string" ? 0.7 : 0.2;
});

const pyReport = analyze(PT, pn, pyComplexity, "complexity");

const similarity = compareFingerprints(report.fingerprint, pyReport.fingerprint);
console.log("JS vs Python fingerprint similarity:", similarity.toFixed(4));

// ── Example 3: Real-time tracker ─────────────────────────

console.log("\n=== Real-time Conservation Tracker ===");

const allTokens = [...uniqueTypes];
const tIndex: Record<string, number> = {};
allTokens.forEach((t, i) => (tIndex[t] = i));

// Get eigenvectors from JS analysis
const lap = buildLaplacian(T, n);
const eigen = eigendecompose(lap.matrix, n);

const tracker = new ConservationTracker(eigen.vectors, tIndex, 10, 3);

// Feed normal tokens
for (const tok of jsTokens) {
  const result = tracker.feed(tok);
  if (result.isAnomaly) {
    console.log(`  ⚠️ Anomaly at "${tok}": score=${result.score.toFixed(4)}, delta=${result.delta.toFixed(4)}`);
  }
}

console.log("Baseline:", tracker.getBaseline()?.toFixed(6));

// Feed a suspicious injection
console.log("\nFeeding anomalous sequence:");
const anomalyTokens = ["keyword", "keyword", "keyword", "string", "keyword"];
for (const tok of anomalyTokens) {
  const result = tracker.feed(tok);
  console.log(`  "${tok}": score=${result.score.toFixed(4)}, anomaly=${result.isAnomaly}`);
}

const trackerReport = tracker.report();
console.log("\nTracker report:", {
  alertCount: trackerReport.alertCount,
  baseline: trackerReport.baseline?.toFixed(6),
  currentScore: trackerReport.currentScore.toFixed(6),
});
