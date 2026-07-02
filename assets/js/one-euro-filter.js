/**
 * Simple Low-Pass Filter
 */
class LowPassFilter {
  constructor(alpha) {
    this.y = null;
    this.alpha = alpha;
  }

  filter(value, alpha) {
    if (alpha !== undefined) {
      this.alpha = alpha;
    }
    if (this.y === null) {
      this.y = value;
    } else {
      this.y = this.alpha * value + (1 - this.alpha) * this.y;
    }
    return this.y;
  }

  reset() {
    this.y = null;
  }
}

/**
 * 1 Euro Filter
 * A first-order low-pass filter with an adaptive cutoff frequency.
 * Designed to address noise/jitter in human computer interaction inputs.
 * Reference: http://www.lifl.fr/~casiez/1euro/
 */
class OneEuroFilter {
  constructor(mincutoff = 1.0, beta = 0.0, dcutoff = 1.0) {
    this.mincutoff = mincutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.xFilter = new LowPassFilter(this.alpha(mincutoff, 1.0));
    this.dxFilter = new LowPassFilter(this.alpha(dcutoff, 1.0));
    this.lastTime = null;
  }

  alpha(cutoff, dt) {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value, timestamp) {
    if (this.lastTime === null || timestamp === undefined) {
      this.lastTime = timestamp || Date.now();
      return this.xFilter.filter(value);
    }

    const dt = (timestamp - this.lastTime) / 1000.0; // dt in seconds
    if (dt <= 0) {
      return this.xFilter.filter(value);
    }

    this.lastTime = timestamp;

    const prevValue = this.xFilter.y;
    const dx = (value - prevValue) / dt;
    const dxFiltered = this.dxFilter.filter(dx, this.alpha(this.dcutoff, dt));

    const cutoff = this.mincutoff + this.beta * Math.abs(dxFiltered);
    const a = this.alpha(cutoff, dt);
    return this.xFilter.filter(value, a);
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}
