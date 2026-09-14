(function (scope) {
  "use strict";
  const COUNT = 96;
  const NEUTRAL = 87;
  const MAX_SPEED = 120;
  const OMEGA = 25;
  const anchors = [0, 12, 20, 32, 44, 56, 68, 79, COUNT];
  const wrap = (value) => ((value % COUNT) + COUNT) % COUNT;
  const delta = (from, to) => wrap(to - from + COUNT / 2) - COUNT / 2;
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  // The recorded look does not move at a constant angular speed. Map the
  // actual poses, including the return-to-front and real entrance frames.
  function frameForAngle(radians) {
    const turn = ((radians / (Math.PI * 2)) % 1 + 1) % 1;
    const sector = turn * 8;
    const index = Math.floor(sector);
    return anchors[index] + (anchors[index + 1] - anchors[index]) * (sector - index);
  }

  function create() {
    let position = NEUTRAL;
    let target = NEUTRAL;
    let velocity = 0;
    let displayed = NEUTRAL;
    let tracking = false;
    let settled = true;
    const state = () => ({ position, target, velocity, frame: wrap(displayed), tracking, settled });
    return {
      state,
      aim(radians) {
        if (!Number.isFinite(radians)) return;
        const desired = frameForAngle(radians);
        const origin = tracking ? target : position;
        target = origin + delta(wrap(origin), desired);
        tracking = true;
        settled = false;
      },
      release() {
        target = position + delta(wrap(position), NEUTRAL);
        tracking = false;
        settled = false;
      },
      reset() {
        position = target = displayed = NEUTRAL;
        velocity = 0;
        tracking = false;
        settled = true;
      },
      step(seconds) {
        if (settled) return state();
        // Discard time spent suspended; never rush through missed poses.
        const dt = Math.min(1 / 30, Math.max(0, Number.isFinite(seconds) ? seconds : 0));
        if (!dt) return state();
        const offset = position - target;
        const term = velocity + OMEGA * offset;
        const decay = Math.exp(-OMEGA * dt);
        const next = target + (offset + term * dt) * decay;
        position += clamp(next - position, MAX_SPEED * dt);
        velocity = clamp((velocity - OMEGA * term * dt) * decay, MAX_SPEED);
        if (Math.abs(position - target) < .015 && Math.abs(velocity) < .12) {
          position = target;
          velocity = 0;
          settled = true;
        }
        // A small hysteresis avoids flickering between neighbouring poses.
        // There is deliberately no alpha crossfade between different heads.
        if (Math.abs(position - displayed) > .56 || settled) displayed = Math.round(position);
        return state();
      }
    };
  }
  const api = { create, frameForAngle, wrap, delta, COUNT, NEUTRAL, MAX_SPEED };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.CodeupGazeMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
