import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  createGamepadManager,
  STANDARD_KEY,
  INPUT_TYPE,
  CANCEL_REASON,
  DEFAULT_CONFIG
} from '../dist/esm/index.js'
import { pad, button, environment } from './helpers.mjs'

function setup(t, options = {}, pads = [pad()]) {
  const env = environment(pads)
  const manager = createGamepadManager(options)
  const errors = []
  manager.on('error', ({ error }) => errors.push(error))
  const main = manager.createController('main')
  manager.activate(main)
  assert.equal(manager.start(), true)
  t.after(() => {
    try {
      manager.destroy()
      assert.deepEqual(errors, [])
    } finally {
      env.restore()
    }
  })
  return { env, manager, main, pads, errors }
}
function record(
  controller,
  key,
  types = ['down', 'up', 'click', 'longpress', 'cancel']
) {
  const events = []
  for (const type of types)
    controller.on(key, type, (event) => events.push(event))
  return events
}
const kinds = (events) => events.map((event) => event.type)

test('short press at 499ms emits down/up/click and preserves raw snapshot values', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  const before = manager.getRawState(manager.getDevices()[0].id)
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step(499)
  assert.deepEqual(kinds(events), ['down', 'up', 'click'])
  assert.equal(events[2].durationMs, 499)
  assert.equal(before.buttons[0].pressed, false)
  assert.ok(Object.isFrozen(before.buttons))
})

test('release at exactly 500ms catches a missed longpress tick, without click', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step(500)
  assert.deepEqual(kinds(events), ['down', 'longpress', 'up'])
  assert.equal(events[1].durationMs, 500)
})

test('longpress fires once and threshold changes apply to the next press', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'RS')
  main.setLongPressMs(700)
  button(a, 11, true)
  env.step()
  main.setLongPressMs(100)
  env.step(500)
  assert.deepEqual(kinds(events), ['down'])
  env.step(200)
  env.step(1000)
  button(a, 11, false)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'longpress', 'up'])
  button(a, 11, true)
  env.step()
  env.step(100)
  assert.equal(events.at(-1).type, 'longpress')
})

test('Xbox to PS handover cancels the old press and retains the first new down', (t) => {
  const a = pad(0, 'Xbox'),
    b = pad(1, 'DualSense')
  const { env, manager, main } = setup(t, {}, [a, b])
  const events = record(main, 'S')
  const changes = []
  manager.on('devicechange', (event) => changes.push(event))
  button(a, 0, true)
  env.step()
  button(b, 0, true)
  env.step(100)
  assert.deepEqual(kinds(events), ['down', 'cancel', 'down'])
  assert.equal(events[1].reason, 'devicechange')
  assert.equal(events[2].device.name, 'DualSense')
  button(a, 0, false)
  env.step()
  assert.equal(manager.getActiveDevice().name, 'DualSense')
  button(b, 0, false)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'cancel', 'down', 'up', 'click'])
  assert.equal(changes.length, 2)
})

test('stick drift and sustained deflection do not steal focus; rearm after centering', (t) => {
  const a = pad(0, 'Xbox'),
    b = pad(1, 'PS')
  const { env, manager, main } = setup(t, {}, [a, b])
  const axes = record(main, 'LS', ['axes', 'cancel'])
  a.axes[0] = 0.8
  env.step()
  assert.equal(manager.getActiveDevice().name, 'Xbox')
  b.axes[0] = 0.15
  env.step()
  assert.equal(manager.getActiveDevice().name, 'Xbox')
  button(b, 0, true)
  env.step()
  assert.equal(manager.getActiveDevice().name, 'PS')
  assert.ok(
    axes.some(
      (event) =>
        event.type === 'axes' &&
        event.reason === 'devicechange' &&
        event.value[0] === 0
    )
  )
  env.step()
  env.step()
  assert.equal(manager.getActiveDevice().name, 'PS')
  a.axes[0] = 0
  env.step()
  a.axes[0] = 0.8
  env.step()
  assert.equal(manager.getActiveDevice().name, 'Xbox')
})

test('simultaneous input prefers current device, otherwise stable connection order', (t) => {
  const a = pad(1, 'First connected'),
    b = pad(0, 'Second connected')
  const { env, manager } = setup(t, {}, [])
  env.connect(a)
  env.connect(b)
  button(a, 0, true)
  button(b, 0, true)
  env.step()
  assert.equal(manager.getActiveDevice().name, 'First connected')
  button(a, 0, false)
  button(b, 0, false)
  env.step()
  button(b, 1, true)
  env.step()
  assert.equal(manager.getActiveDevice().name, 'Second connected')
  button(a, 2, true)
  button(b, 2, true)
  env.step()
  assert.equal(manager.getActiveDevice().name, 'Second connected')
})

test('custom extended buttons, missing keys and independent stick press/motion', (t) => {
  const a = pad(0, 'Extended')
  const { env, manager, main } = setup(
    t,
    {
      axes: { deadZone: 0 },
      mappings: [
        {
          match: (raw) => raw.id === 'Extended',
          extends: 'standard',
          buttons: { P1: 17, HM: null }
        }
      ]
    },
    [a]
  )
  const extra = record(main, 'P1')
  const stick = record(main, 'RS', ['axes', 'click'])
  assert.equal(
    manager.getDevices()[0].controls.some((control) => control.key === 'HM'),
    false
  )
  assert.ok(
    manager.getDevices()[0].controls.find((control) => control.key === 'RS')
      .button
  )
  button(a, 17, true)
  env.step()
  button(a, 17, false)
  env.step(100)
  a.axes[2] = 0.5
  button(a, 11, true)
  env.step()
  button(a, 11, false)
  env.step(100)
  a.axes[2] = 0
  env.step()
  assert.deepEqual(kinds(extra), ['down', 'up', 'click'])
  assert.ok(
    stick.some((event) => event.type === 'axes' && event.value[0] === 0.5)
  )
  assert.ok(stick.some((event) => event.type === 'click'))
  assert.deepEqual(stick.at(-1).value, [0, 0])
  const count = stick.length
  env.step()
  assert.equal(stick.length, count)
})

test('nonstandard mapping and axis buttons use correct indices, ranges and hysteresis', (t) => {
  const a = pad(0, 'Special', '', 5, [0, 0, -1, 0, 0, 0])
  const { env, manager, main } = setup(
    t,
    {
      axes: { deadZone: 0 },
      mappings: [
        {
          match: (raw) => raw.id === 'Special',
          buttons: {
            S: 2,
            LT: {
              axis: 2,
              range: [-1, 1],
              pressThreshold: 0.6,
              releaseThreshold: 0.4
            }
          },
          sticks: { RS: { x: 4, y: 5, invertY: true } }
        }
      ]
    },
    [a]
  )
  const s = record(main, 'S')
  const lt = record(main, 'LT')
  const rs = record(main, 'RS', ['axes'])
  button(a, 2, true)
  env.step()
  button(a, 2, false)
  env.step(50)
  a.axes[2] = 0.4
  env.step()
  a.axes[2] = 0
  env.step()
  assert.deepEqual(kinds(lt), ['down'])
  a.axes[2] = -0.3
  a.axes[5] = 0.7
  env.step()
  assert.deepEqual(kinds(lt), ['down', 'up', 'click'])
  assert.deepEqual(kinds(s), ['down', 'up', 'click'])
  assert.deepEqual(rs.at(-1).value, [0, -0.7])
  assert.equal(
    manager.getDevices()[0].controls.find((control) => control.key === 'RS')
      .button,
    false
  )
})

test('unknown nonstandard devices expose raw data without guessing logical input', (t) => {
  const a = pad(0, 'Unknown', '')
  const { env, manager, main } = setup(t, {}, [a])
  const events = record(main, 'S')
  button(a, 0, true)
  env.step()
  assert.equal(manager.getDevices()[0].mapping, 'unmapped')
  assert.deepEqual(manager.getDevices()[0].controls, [])
  assert.equal(
    manager.getRawState(manager.getDevices()[0].id).buttons[0].pressed,
    true
  )
  assert.deepEqual(events, [])
})

test('custom normalizer supports unusual encodings and copies its returned data', (t) => {
  const a = pad(0, 'Hat pad', '', 1, [-1])
  const shared = { buttons: { DU: { pressed: false, value: 0 } }, sticks: {} }
  const { env, main } = setup(
    t,
    {
      mappings: [
        {
          match: () => true,
          normalize: (raw) => {
            shared.buttons.DU.pressed = raw.axes[0] === 0
            shared.buttons.DU.value = shared.buttons.DU.pressed ? 1 : 0
            return shared
          }
        }
      ]
    },
    [a]
  )
  const events = record(main, 'DU')
  a.axes[0] = 0
  env.step()
  a.axes[0] = -1
  env.step()
  assert.deepEqual(kinds(events), ['down', 'up', 'click'])
})

test('release batch stays on original scene and nested push/pop restores the previous set', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const dialog = manager.createController('dialog')
  const drawer = manager.createController('drawer')
  const order = []
  main.on('S', 'up', () => {
    order.push('main/up')
    manager.push(dialog)
  })
  main.on('S', 'click', () => order.push('main/click'))
  dialog.on('S', 'click', () => order.push('dialog/click'))
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.deepEqual(order, ['main/up', 'main/click'])
  assert.deepEqual(manager.getActiveControllers(), [dialog])
  manager.push(drawer)
  manager.pop()
  assert.deepEqual(manager.getActiveControllers(), [dialog])
  manager.pop()
  manager.pop()
  manager.pop()
  assert.deepEqual(manager.getActiveControllers(), [main])
})

test('scene changes cancel held controls and do not replay down into new scenes', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const dialog = manager.createController('dialog')
  const old = record(main, 'S')
  const next = record(dialog, 'S')
  main.on('S', 'down', () => manager.push(dialog))
  button(a, 0, true)
  env.step()
  env.step(1000)
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(old), ['down', 'cancel'])
  assert.equal(old[1].reason, 'scene')
  assert.deepEqual(next, [])
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(next), ['down'])
})

test('disabling cancels, subscriptions can be edited while disabled, and reenable does not replay', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  let removed = 0,
    added = 0
  const off = main.on('S', 'click', () => removed++)
  button(a, 0, true)
  env.step()
  main.setEnabled('S', false)
  off()
  main.on('S', 'click', () => added++)
  main.setEnabled('S', true)
  env.step(1000)
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.equal(removed, 0)
  assert.equal(added, 1)
})

test('fixed-device controllers isolate buttons and axes and do not steal shared input', (t) => {
  const a = pad(0, 'A'),
    b = pad(1, 'B')
  const { env, manager, main } = setup(t, {}, [a, b])
  const fixed = manager.createController('player2', {
    deviceId: manager.getDevices()[1].id
  })
  manager.activate([main, fixed])
  const shared = record(main, 'S')
  const bound = record(fixed, 'S')
  const boundAxes = record(fixed, 'LS', ['axes'])
  button(a, 0, true)
  env.step()
  button(b, 0, true)
  b.axes[0] = 0.8
  env.step()
  assert.equal(manager.getActiveDevice().name, 'A')
  assert.equal(shared.length, 1)
  assert.equal(bound[0].device.name, 'B')
  assert.equal(boundAxes[0].device.name, 'B')
  a.axes[0] = 0.9
  b.axes[0] = 0
  env.step()
  assert.deepEqual(boundAxes.at(-1).value, [0, 0])
})

test('disconnect releases state; reused browser index gets a fresh session', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  const oldId = manager.getDevices()[0].id
  button(a, 0, true)
  env.step()
  env.disconnect(a)
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  assert.equal(events.at(-1).reason, 'disconnect')
  assert.equal(manager.getActiveDevice(), null)
  const b = pad(0, 'Xbox')
  env.connect(b)
  assert.notEqual(manager.getDevices()[0].id, oldId)
  button(b, 0, true)
  env.step()
  assert.equal(events.at(-1).type, 'down')
  assert.equal(manager.running, true)
})

test('sparse getGamepads entries do not prevent other devices from being processed', (t) => {
  const a = pad(3, 'At index three')
  const { env, main } = setup(t, {}, [a])
  const events = record(main, 'S')
  button(a, 0, true)
  env.step()
  assert.equal(events[0].device.index, 3)
})

test('one RAF, one getGamepads per frame, stop/start and destroy cleanup', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  manager.start()
  manager.start()
  assert.equal(env.pendingFrames, 1)
  const reads = env.reads
  button(a, 0, true)
  env.step()
  assert.equal(env.reads, reads + 1)
  manager.stop()
  assert.equal(env.pendingFrames, 0)
  assert.equal(events.at(-1).reason, 'stop')
  manager.start()
  env.step(1000)
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  button(a, 0, false)
  env.step()
  button(a, 0, true)
  env.step()
  assert.equal(events.at(-1).type, 'down')
  manager.destroy()
  assert.equal(env.pendingFrames, 0)
  assert.throws(() => manager.start(), /destroyed/)
  env.connect(pad(1))
  assert.deepEqual(manager.getDevices(), [])
})

test('hidden and blurred pages cancel and rebaseline held input on resume', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = record(main, 'S')
  button(a, 0, true)
  env.step()
  env.hide()
  env.step(2000)
  env.show()
  env.step()
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  assert.equal(events[1].reason, 'hidden')
  button(a, 0, false)
  env.step()
  button(a, 0, true)
  env.step()
  env.win.dispatchEvent(new Event('blur'))
  assert.equal(events.at(-1).reason, 'blur')
  env.win.dispatchEvent(new Event('focus'))
  env.step()
  assert.equal(events.at(-1).type, 'cancel')
})

test('listener exceptions are reported while other callbacks and future frames continue', (t) => {
  const {
    env,
    main,
    pads: [a],
    errors
  } = setup(t)
  let count = 0
  const boom = new Error('handler failed')
  main.on('S', 'down', () => {
    throw boom
  })
  main.on('S', 'down', () => count++)
  button(a, 0, true)
  env.step()
  assert.deepEqual(errors.splice(0), [boom])
  assert.equal(count, 1)
  assert.equal(env.pendingFrames, 1)
})

test('controller destruction prunes scene history and ignores foreign managers', (t) => {
  const { manager, main } = setup(t)
  const dialog = manager.createController('dialog')
  manager.push(dialog)
  dialog.destroy()
  assert.deepEqual(manager.getActiveControllers(), [main])
  assert.throws(() => manager.activate(dialog), /does not belong/)
  const other = createGamepadManager()
  const foreign = other.createController('foreign')
  assert.throws(() => manager.activate(foreign), /does not belong/)
  other.destroy()
})

test('per-controller thresholds and simultaneous active event collections stay independent', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const second = manager.createController('second', {
    press: { longPressMs: 100 }
  })
  manager.activate([main, second])
  const one = record(main, 'S'),
    two = record(second, 'S')
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step(200)
  assert.deepEqual(kinds(one), ['down', 'up', 'click'])
  assert.deepEqual(kinds(two), ['down', 'longpress', 'up'])
})

test('configuration rejects invalid thresholds and malformed mappings', () => {
  assert.throws(
    () => createGamepadManager({ press: { longPressMs: 0 } }),
    RangeError
  )
  assert.throws(
    () => createGamepadManager({ axes: { deadZone: 1 } }),
    RangeError
  )
  assert.throws(
    () =>
      createGamepadManager({
        takeover: { threshold: 0.1, resetThreshold: 0.2 }
      }),
    RangeError
  )
  assert.throws(
    () =>
      createGamepadManager({
        mappings: [{ match: () => true, buttons: { S: -1 } }]
      }),
    RangeError
  )
  assert.throws(
    () =>
      createGamepadManager({
        mappings: [
          { match: () => true, buttons: { S: { axis: 0, range: [1, 1] } } }
        ]
      }),
    RangeError
  )
  assert.throws(
    () =>
      createGamepadManager({
        mappings: [
          {
            match: () => true,
            extends: 'standard',
            normalize: () => ({ buttons: {}, sticks: {} })
          }
        ]
      }),
    TypeError
  )
})

test('package can be imported without browser globals and required as CommonJS', () => {
  const manager = createGamepadManager()
  assert.equal(manager.start(), false)
  manager.destroy()
  const require = createRequire(import.meta.url)
  assert.equal(
    typeof require('../dist/cjs/index.cjs').createGamepadManager,
    'function'
  )
})

test('exported constants are immutable and work directly in subscriptions', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = []
  main.on(STANDARD_KEY.S, INPUT_TYPE.click, (event) => events.push(event))
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.equal(events[0].key, STANDARD_KEY.S)
  assert.equal(CANCEL_REASON.scene, 'scene')
  assert.equal(DEFAULT_CONFIG.press.longPressMs, 500)
  assert.throws(() => {
    STANDARD_KEY.S = 'OTHER'
  }, TypeError)
  assert.throws(() => {
    DEFAULT_CONFIG.press.longPressMs = 1
  }, TypeError)
})
test('duplicate connection notifications preserve session identity and pending gestures', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const id = manager.getDevices()[0].id
  const events = record(main, 'S')
  button(a, 0, true)
  env.step()
  env.connect(a)
  assert.equal(manager.getDevices()[0].id, id)
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'up', 'click'])
})
test('initially held controls are baselined until release and a fresh operation', (t) => {
  const a = pad()
  button(a, 0, true)
  a.axes[0] = 0.9
  const { env, manager, main } = setup(t, {}, [a])
  const events = record(main, 'S')
  env.step(1000)
  assert.equal(manager.getActiveDevice(), null)
  assert.deepEqual(events, [])
  button(a, 0, false)
  a.axes[0] = 0
  env.step()
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(events), ['down'])
})
test('callbacks registered twice are deduplicated and unsubscribe is idempotent', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  let count = 0
  const listener = () => count++
  const off = main.on('S', 'click', listener)
  main.on('S', 'click', listener)
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.equal(count, 1)
  off()
  off()
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.equal(count, 1)
})

/** Record every combo gesture event for behavioral assertions. */
function recordCombo(controller, keys, options) {
  const events = []
  for (const type of ['down', 'up', 'click', 'longpress', 'cancel'])
    controller.onCombo(keys, type, (event) => events.push(event), options)
  return events
}

test('combo starts at the last member, ends on first release and coexists with singles', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const combo = recordCombo(main, ['LB', 'S'])
  const singles = record(main, 'S')
  button(a, 4, true)
  env.step()
  env.step(1000)
  assert.deepEqual(kinds(combo), [])
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(combo), ['down'])
  button(a, 4, false)
  env.step(499)
  assert.deepEqual(kinds(combo), ['down', 'up', 'click'])
  assert.equal(combo.at(-1).durationMs, 499)
  assert.deepEqual(combo[0].keys, ['LB', 'S'])
  assert.equal(combo[0].value, 1)
  assert.ok(Object.isFrozen(combo[0]) && Object.isFrozen(combo[0].keys))
  assert.equal(combo[0].device.id, singles[0].device.id)
  assert.deepEqual(kinds(singles), ['down'])
  button(a, 0, false)
  env.step(0)
  assert.deepEqual(kinds(singles), ['down', 'up', 'click'])
})

test('combo can be pressed in either order and retriggered while a modifier remains held', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = recordCombo(main, ['LB', 'S'])
  button(a, 0, true)
  env.step()
  button(a, 4, true)
  env.step()
  button(a, 0, false)
  env.step()
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(events), [
    'down',
    'up',
    'click',
    'down',
    'up',
    'click'
  ])
})

test('combo longpress uses captured threshold and release at exact boundary never clicks', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = recordCombo(main, ['LB', 'S'])
  main.setLongPressMs(700)
  button(a, 4, true)
  button(a, 0, true)
  env.step()
  main.setLongPressMs(100)
  env.step(699)
  assert.deepEqual(kinds(events), ['down'])
  button(a, 0, false)
  env.step(1)
  assert.deepEqual(kinds(events), ['down', 'longpress', 'up'])
  assert.equal(events[1].durationMs, 700)
  button(a, 0, true)
  env.step()
  env.step(100)
  env.step(1000)
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(events), [
    'down',
    'longpress',
    'up',
    'down',
    'longpress',
    'up'
  ])
})

test('suppressSingles cancels an earlier member and suppresses completing presses through release', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const lb = record(main, 'LB')
  const south = record(main, 'S')
  const combo = recordCombo(main, ['LB', 'S'], { suppressSingles: true })
  button(a, 4, true)
  env.step()
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(lb), ['down', 'cancel'])
  assert.equal(lb[1].reason, CANCEL_REASON.combo)
  assert.deepEqual(south, [])
  button(a, 0, false)
  env.step()
  env.step(1000)
  button(a, 4, false)
  env.step()
  assert.deepEqual(kinds(combo), ['down', 'up', 'click'])
  assert.deepEqual(kinds(lb), ['down', 'cancel'])
  assert.deepEqual(south, [])
  button(a, 0, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(south), ['down', 'up', 'click'])
})

test('simultaneous suppressed combo has no single down; stick movement remains independent', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const ls = record(main, 'LS')
  const south = record(main, 'S')
  const axes = record(main, 'LS', ['axes'])
  const combo = recordCombo(main, ['LS', 'S'], { suppressSingles: true })
  a.axes[0] = 0.8
  button(a, 10, true)
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(combo), ['down'])
  assert.deepEqual(ls, [])
  assert.deepEqual(south, [])
  assert.equal(axes.length, 1)
  assert.ok(axes[0].value[0] > 0)
  button(a, 0, false)
  env.step()
  assert.equal(axes.length, 2)
  assert.deepEqual(kinds(combo), ['down', 'up', 'click'])
})

test('combo never combines devices and handover cancels the old active chord', (t) => {
  const a = pad(0, 'Xbox'),
    b = pad(1, 'PS5')
  const { env, main } = setup(t, {}, [a, b])
  const events = recordCombo(main, ['LB', 'S'])
  button(a, 4, true)
  env.step()
  button(b, 0, true)
  env.step()
  assert.deepEqual(events, [])
  button(b, 4, true)
  env.step()
  assert.deepEqual(kinds(events), ['down'])
  button(a, 0, true)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  assert.equal(events[1].reason, 'devicechange')
  // A's already-held LB is not inherited from an earlier routing session.
  button(a, 4, false)
  env.step()
  button(a, 4, true)
  env.step()
  assert.deepEqual(kinds(events), ['down', 'cancel', 'down'])
  assert.notEqual(events[0].device.id, events[2].device.id)
  env.disconnect(a)
  assert.equal(events.at(-1).reason, 'disconnect')
})

test('combo up/click is atomic across scene changes and held buttons do not replay', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const next = manager.createController('next')
  const first = recordCombo(main, ['LB', 'S'])
  const second = recordCombo(next, ['LB', 'S'])
  main.onCombo(['LB', 'S'], 'up', () => manager.push(next))
  button(a, 0, true)
  button(a, 4, true)
  env.step()
  button(a, 0, false)
  env.step()
  assert.deepEqual(kinds(first), ['down', 'up', 'click'])
  button(a, 0, true)
  env.step()
  assert.deepEqual(second, [])
  button(a, 4, false)
  env.step()
  button(a, 4, true)
  env.step()
  assert.deepEqual(kinds(second), ['down'])
  manager.pop()
  assert.equal(second.at(-1).reason, 'scene')
  env.step(1000)
  assert.deepEqual(kinds(first), ['down', 'up', 'click'])
})

test('disabling a combo member cancels and requires fresh eligible presses after re-enable', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  const events = recordCombo(main, ['LB', 'S'])
  button(a, 0, true)
  button(a, 4, true)
  env.step()
  main.setEnabled('S', false)
  assert.equal(events.at(-1).reason, 'disabled')
  main.setEnabled('S', true)
  env.step(1000)
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  for (const index of [0, 4]) button(a, index, false)
  env.step()
  for (const index of [0, 4]) button(a, index, true)
  env.step()
  assert.equal(events.at(-1).type, 'down')
})

test('combo lifecycle cancellation handles blur, stop, rebind and destroy without clicks', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const events = recordCombo(main, ['LB', 'S'])
  function press() {
    for (const index of [0, 4]) button(a, index, false)
    env.step()
    for (const index of [0, 4]) button(a, index, true)
    env.step()
  }
  press()
  env.win.dispatchEvent(new Event('blur'))
  assert.equal(events.at(-1).reason, 'blur')
  env.win.dispatchEvent(new Event('focus'))
  env.step(1000)
  assert.deepEqual(kinds(events), ['down', 'cancel'])
  press()
  manager.stop()
  assert.equal(events.at(-1).reason, 'stop')
  manager.start()
  press()
  main.setDevice(manager.getDevices()[0].id)
  assert.equal(events.at(-1).reason, 'rebind')
  press()
  main.destroy()
  assert.equal(events.at(-1).reason, 'destroy')
  assert.ok(
    events.every((event) => event.type === 'down' || event.type === 'cancel')
  )
})

test('extension and three-button combos work; missing capability cancels an active combo', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t, {
    mappings: [{ match: () => true, extends: 'standard', buttons: { P1: 17 } }]
  })
  const events = recordCombo(main, ['LB', 'S', 'P1'])
  button(a, 4, true)
  button(a, 0, true)
  env.step()
  assert.deepEqual(events, [])
  button(a, 17, true)
  env.step()
  assert.deepEqual(kinds(events), ['down'])
  a.buttons.length = 17
  env.step()
  assert.equal(events.at(-1).reason, 'unavailable')
})

test('combo identity ignores order, deduplicates listeners and validates shared configuration', (t) => {
  const {
    env,
    main,
    pads: [a]
  } = setup(t)
  let count = 0
  const listener = () => count++
  const keys = ['S', 'LB']
  const off = main.onCombo(keys, 'down', listener, { suppressSingles: true })
  keys[0] = 'E'
  main.onCombo(['LB', 'S'], 'down', listener)
  assert.throws(
    () =>
      main.onCombo(['S', 'LB'], 'click', () => {}, { suppressSingles: false }),
    /Conflicting/
  )
  assert.throws(() => main.onCombo(['S'], 'click', () => {}), /two distinct/)
  assert.throws(
    () => main.onCombo(['S', 'S'], 'click', () => {}),
    /two distinct/
  )
  assert.throws(
    () => main.onCombo(['south', 'LB'], 'click', () => {}),
    /Invalid logical/
  )
  assert.throws(
    () => main.onCombo(['S', 'LB'], 'axes', () => {}),
    /button events/
  )
  assert.throws(
    () =>
      main.onCombo(['S', 'LB'], 'click', () => {}, { suppressSingles: 'yes' }),
    /boolean/
  )
  button(a, 0, true)
  button(a, 4, true)
  env.step()
  assert.equal(count, 1)
  off()
  off()
  main.onCombo(['LB', 'S'], 'down', listener, { suppressSingles: false })
  env.step()
  assert.equal(count, 1)
  button(a, 0, false)
  button(a, 4, false)
  env.step()
  button(a, 0, true)
  button(a, 4, true)
  env.step()
  assert.equal(count, 2)
})

test('overlapping chords are independent; callback exceptions do not stop later listeners', (t) => {
  const {
    env,
    main,
    errors,
    pads: [a]
  } = setup(t)
  const small = recordCombo(main, ['LB', 'S'])
  const large = recordCombo(main, ['LB', 'S', 'E'])
  main.onCombo(['LB', 'S'], 'down', () => {
    throw new Error('combo handler')
  })
  let after = false
  main.onCombo(['LB', 'S'], 'down', () => {
    after = true
  })
  for (const index of [0, 1, 4]) button(a, index, true)
  env.step()
  assert.equal(after, true)
  assert.deepEqual(kinds(small), ['down'])
  assert.deepEqual(kinds(large), ['down'])
  assert.equal(errors.pop().message, 'combo handler')
})

test('cancellation callbacks changing scenes prevent delivery to an obsolete combo', (t) => {
  const {
    env,
    manager,
    main,
    pads: [a]
  } = setup(t)
  const next = manager.createController('next')
  main.on('LB', 'cancel', () => manager.activate(next))
  const events = recordCombo(main, ['LB', 'S'], { suppressSingles: true })
  button(a, 4, true)
  env.step()
  button(a, 0, true)
  env.step()
  assert.deepEqual(events, [])
  assert.equal(manager.getActiveControllers()[0], next)
})

test('initially held combo members are baselined and pinned controllers stay device-isolated', (t) => {
  const a = pad(0),
    b = pad(1, 'PS5')
  button(a, 4, true)
  const { env, manager, main } = setup(t, {}, [a, b])
  const events = recordCombo(main, ['LB', 'S'])
  button(a, 0, true)
  env.step()
  assert.deepEqual(events, [])
  const [first, second] = manager.getDevices()
  main.setDevice(first.id)
  const other = manager.createController('other', { deviceId: second.id })
  const otherEvents = recordCombo(other, ['LB', 'S'])
  manager.activate([main, other])
  for (const index of [0, 4]) button(a, index, false)
  env.step()
  button(a, 4, true)
  button(b, 0, true)
  env.step()
  assert.deepEqual(events, [])
  assert.deepEqual(otherEvents, [])
  button(a, 0, true)
  button(b, 4, true)
  env.step()
  assert.deepEqual(kinds(events), ['down'])
  assert.deepEqual(kinds(otherEvents), ['down'])
  assert.notEqual(events[0].device.id, otherEvents[0].device.id)
})
