/**
 * ConservationTracker — real-time sliding-window conservation monitoring
 * Ported from moo-spectral.js with TypeScript types.
 */

import type { Alert, EigenResult } from "./types";

export class ConservationTracker {
  private eigenvectors: Float64Array[];
  private indexMap: Map<string, number>;
  private windowSize: number;
  private numComponents: number;
  private history: number[] = [];
  private scores: number[] = [];
  private baseline: number | null = null;
  private alerts: Alert[] = [];

  constructor(
    eigenvectors: Float64Array[],
    indexMap: Map<string, number> | Record<string, number>,
    windowSize = 20,
    numComponents = 5
  ) {
    this.eigenvectors = eigenvectors;
    if (indexMap instanceof Map) {
      this.indexMap = indexMap;
    } else {
      this.indexMap = new Map(Object.entries(indexMap));
    }
    this.windowSize = windowSize;
    this.numComponents = Math.min(numComponents, eigenvectors[0]?.length ?? 0);
  }

  /**
   * Feed a token/vertex label and update the sliding window.
   */
  feed(label: string): Alert {
    let idx = this.indexMap.get(label);
    if (idx === undefined) {
      idx = Math.floor(this.eigenvectors.length / 2);
    }

    this.history.push(idx);
    if (this.history.length > this.windowSize * 2) {
      this.history = this.history.slice(-this.windowSize);
    }

    if (this.history.length < 3) {
      const alert: Alert = { score: 0, delta: 0, isAnomaly: false, timestamp: Date.now() };
      return alert;
    }

    // Compute conservation = mean gradient variance across top eigenvectors
    let totalVar = 0;
    for (let ev = 0; ev < this.numComponents; ev++) {
      const projections = new Float64Array(this.history.length);
      for (let i = 0; i < this.history.length; i++) {
        projections[i] = this.eigenvectors[this.history[i]][ev];
      }

      // Gradient variance
      const diffs = new Float64Array(projections.length - 1);
      for (let i = 0; i < diffs.length; i++) {
        diffs[i] = projections[i + 1] - projections[i];
      }

      let mean = 0;
      for (let i = 0; i < diffs.length; i++) mean += diffs[i];
      mean /= diffs.length;

      let v = 0;
      for (let i = 0; i < diffs.length; i++) v += (diffs[i] - mean) ** 2;
      v /= diffs.length;
      totalVar += v;
    }

    const score = totalVar / this.numComponents;

    // Establish baseline from first few windows
    if (this.baseline === null && this.scores.length >= 5) {
      let sum = 0;
      for (let i = 0; i < this.scores.length; i++) sum += this.scores[i];
      this.baseline = sum / this.scores.length;
    }

    const delta = this.baseline !== null ? score / this.baseline : 1;
    const isAnomaly = this.baseline !== null && delta > 2.25;

    this.scores.push(score);
    if (this.scores.length > 100) this.scores = this.scores.slice(-50);

    const alert: Alert = { score, delta, isAnomaly, timestamp: Date.now() };
    if (isAnomaly) this.alerts.push(alert);
    return alert;
  }

  /**
   * Check current conservation status without feeding.
   */
  check(): { score: number; delta: number; isAnomaly: boolean } {
    if (this.scores.length === 0) return { score: 0, delta: 0, isAnomaly: false };
    const lastScore = this.scores[this.scores.length - 1];
    const delta = this.baseline !== null ? lastScore / this.baseline : 1;
    return { score: lastScore, delta, isAnomaly: delta > 2.25 };
  }

  /**
   * Get a report of the tracking state.
   */
  report(): {
    windowSize: number;
    numComponents: number;
    baseline: number | null;
    currentScore: number;
    alertCount: number;
    recentAlerts: Alert[];
  } {
    return {
      windowSize: this.windowSize,
      numComponents: this.numComponents,
      baseline: this.baseline,
      currentScore: this.scores.length > 0 ? this.scores[this.scores.length - 1] : 0,
      alertCount: this.alerts.length,
      recentAlerts: this.alerts.slice(-10),
    };
  }

  /**
   * Suggest a correction for an unexpected label, based on eigenspace proximity.
   */
  suggestCorrection(
    errorLabel: string,
    recentLabels: string[]
  ): { suggestedLabel: string; confidence: number } {
    if (!recentLabels || recentLabels.length === 0) {
      return { suggestedLabel: errorLabel, confidence: 0 };
    }

    const n = this.eigenvectors.length;
    const ev = this.numComponents;

    // Compute expected position from recent labels
    const expected = new Float64Array(ev);
    let count = 0;
    for (const label of recentLabels) {
      const idx = this.indexMap.get(label);
      if (idx !== undefined) {
        for (let k = 0; k < ev; k++) expected[k] += this.eigenvectors[idx][k];
        count++;
      }
    }
    if (count === 0) return { suggestedLabel: errorLabel, confidence: 0 };
    for (let k = 0; k < ev; k++) expected[k] /= count;

    // Find the label closest to expected in eigenspace
    let bestLabel = errorLabel;
    let bestDist = Infinity;

    for (const [label, idx] of this.indexMap) {
      let dist = 0;
      for (let k = 0; k < ev; k++) {
        const d = this.eigenvectors[idx][k] - expected[k];
        dist += d * d;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = label;
      }
    }

    const maxPossibleDist = ev;
    const confidence = Math.max(0, Math.min(1, 1 - bestDist / maxPossibleDist));
    return { suggestedLabel: bestLabel, confidence };
  }

  /** Reset the tracker. */
  reset(): void {
    this.history = [];
    this.scores = [];
    this.baseline = null;
    this.alerts = [];
  }

  /** Get current baseline value. */
  getBaseline(): number | null {
    return this.baseline;
  }

  /** Get all recorded scores. */
  getScores(): number[] {
    return [...this.scores];
  }
}
