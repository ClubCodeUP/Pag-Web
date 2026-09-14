const { test } = require('node:test');
const assert = require('node:assert/strict');
const Motion = require('../js/gaze-motion.js');

function settle(motion, fps = 60) {
  for (let i = 0; i < fps * 5 && !motion.state().settled; i++) motion.step(1 / fps);
  assert.equal(motion.state().settled, true);
  return motion.state();
}

test('starts frontal and never teleports on first pointer entry', () => {
  const motion = Motion.create();
  motion.aim(Math.PI);
  assert.equal(motion.state().position, Motion.NEUTRAL);
  assert.notEqual(motion.state().target, Motion.NEUTRAL);
  assert.ok(Math.abs(motion.step(1 / 60).position - Motion.NEUTRAL) < 2.01);
});

test('poses are calibrated and the circular seam takes the short route', () => {
  assert.equal(Motion.frameForAngle(0), 0);
  assert.equal(Motion.frameForAngle(Math.PI / 2), 20);
  assert.equal(Motion.frameForAngle(Math.PI), 44);
  assert.equal(Motion.frameForAngle(Math.PI * 1.5), 68);
  const motion = Motion.create();
  motion.aim(-.04);
  settle(motion);
  const before = motion.state().position;
  motion.aim(.04);
  assert.ok(Math.abs(motion.state().target - before) < 2);
  settle(motion);
});

test('converges at different refresh rates without unstable or invalid frames', () => {
  for (const fps of [24, 30, 60, 90, 120, 144]) {
    const motion = Motion.create();
    for (const angle of [0, Math.PI, -Math.PI / 2, Math.PI / 2, -.01, .01]) {
      motion.aim(angle);
      let previous = motion.state().position;
      for (let i = 0; i < fps * 3; i++) {
        const state = motion.step(1 / fps);
        assert.ok(Number.isFinite(state.position));
        assert.ok(state.frame >= 0 && state.frame < Motion.COUNT);
        assert.ok(Math.abs(state.position - previous) <= Motion.MAX_SPEED * Math.min(1 / fps, 1 / 30) + .02);
        previous = state.position;
      }
      assert.equal(motion.state().settled, true, 'refresh rate ' + fps);
      assert.ok(Math.abs(Motion.delta(Motion.wrap(motion.state().position), Motion.frameForAngle(angle))) < .02);
    }
  }
});

test('long stalls do not fast-forward through a large part of the sequence', () => {
  const motion = Motion.create();
  motion.aim(Math.PI);
  const before = motion.step(1 / 60).position;
  const after = motion.step(10);
  assert.ok(Math.abs(after.position - before) <= 4.01);
  settle(motion);
});

test('leaving and re-entering mid-return preserves the current pose', () => {
  const motion = Motion.create();
  motion.aim(Math.PI);
  settle(motion);
  const before = motion.state().position;
  motion.release();
  assert.equal(motion.state().position, before);
  for (let i = 0; i < 8; i++) motion.step(1 / 60);
  const interrupted = motion.state().position;
  motion.aim(Math.PI / 2);
  assert.equal(motion.state().position, interrupted);
  settle(motion);
  motion.release();
  const neutral = settle(motion);
  assert.equal(neutral.frame, Motion.NEUTRAL);
  assert.equal(neutral.tracking, false);
});

test('resting poses stop work; repeated input and non-finite values stay safe', () => {
  const motion = Motion.create();
  motion.aim(NaN);
  assert.equal(motion.state().settled, true);
  for (let i = 0; i < 1000; i++) {
    motion.aim(Math.sin(i / 7) * Math.PI);
    motion.step(i % 5 ? 1 / 120 : .2);
  }
  motion.release();
  settle(motion);
  const neutral = motion.state();
  assert.deepEqual(motion.step(1), neutral);
  motion.reset();
  assert.equal(motion.state().frame, Motion.NEUTRAL);
});
