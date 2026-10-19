export function pad(
  index = 0,
  name = 'Xbox',
  mapping = 'standard',
  buttonCount = 19,
  axes = [0, 0, 0, 0]
) {
  return {
    index,
    id: name,
    mapping,
    connected: true,
    timestamp: 0,
    buttons: Array.from({ length: buttonCount }, () => ({
      pressed: false,
      touched: false,
      value: 0
    })),
    axes: [...axes]
  }
}
export function button(device, index, pressed, value = pressed ? 1 : 0) {
  Object.assign(device.buttons[index], { pressed, touched: pressed, value })
}
export function environment(initial = []) {
  const names = [
    'window',
    'document',
    'navigator',
    'performance',
    'requestAnimationFrame',
    'cancelAnimationFrame'
  ]
  const saved = new Map(
    names.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name)
    ])
  )
  const win = new EventTarget()
  const doc = new EventTarget()
  doc.visibilityState = 'visible'
  let time = 0,
    nextFrame = 0,
    reads = 0
  const frames = new Map()
  const devices = []
  for (const device of initial) devices[device.index] = device
  const values = {
    window: win,
    document: doc,
    navigator: {
      getGamepads: () => {
        reads++
        return [...devices]
      }
    },
    performance: { now: () => time },
    requestAnimationFrame: (callback) => {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    },
    cancelAnimationFrame: (id) => frames.delete(id)
  }
  for (const name of names)
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: values[name]
    })
  const event = (type, gamepad) =>
    win.dispatchEvent(Object.assign(new Event(type), { gamepad }))
  return {
    win,
    doc,
    devices,
    get pendingFrames() {
      return frames.size
    },
    get reads() {
      return reads
    },
    step(ms = 16) {
      time += ms
      const callbacks = [...frames.values()]
      frames.clear()
      for (const callback of callbacks) callback(time)
    },
    connect(device) {
      device.connected = true
      devices[device.index] = device
      event('gamepadconnected', device)
    },
    disconnect(device) {
      device.connected = false
      devices[device.index] = null
      event('gamepaddisconnected', device)
    },
    hide() {
      doc.visibilityState = 'hidden'
      doc.dispatchEvent(new Event('visibilitychange'))
    },
    show() {
      doc.visibilityState = 'visible'
      doc.dispatchEvent(new Event('visibilitychange'))
    },
    restore() {
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor)
        else delete globalThis[name]
      }
    }
  }
}
