import {
  createGamepadManager,
  STANDARD_KEY,
  INPUT_TYPE,
  type Vector
} from '../src/index'

const manager = createGamepadManager<'P1' | 'TP'>({
  mappings: [
    { match: () => true, extends: 'standard', buttons: { P1: 17, TP: 18 } }
  ]
})
const main = manager.createController('main')
main.on('S', 'click', (event) => {
  const value: number = event.value
  void value
})
main.on('LS', 'axes', (event) => {
  const value: Vector = event.value
  void value
})
main.on('LS', 'longpress', (event) => {
  const duration: number = event.durationMs
  void duration
})
main.on('P1', 'click', () => {})
main.on('TP', 'cancel', (event) => {
  const reason: string = event.reason
  void reason
})
// @ts-expect-error Unknown extension key
main.on('P2', 'click', () => {})
// @ts-expect-error Face buttons do not expose axes
main.on('S', 'axes', () => {})
// @ts-expect-error Lowercase names are not logical keys
main.on('south', 'click', () => {})
// @ts-expect-error Unknown event type
main.on('LS', 'doubleclick', () => {})
// @ts-expect-error Click values are numbers, not vectors
main.on('S', 'click', (event: { value: Vector }) => {
  void event
})
const standardOnly = createGamepadManager().createController('standard')
// @ts-expect-error Default manager has no extension keys
standardOnly.on('P1', 'click', () => {})

main.on(STANDARD_KEY.LS, INPUT_TYPE.longpress, (event) => {
  const duration: number = event.durationMs
  void duration
})

main.onCombo([STANDARD_KEY.LB, 'P1'], INPUT_TYPE.click, (event) => {
  const keys: readonly ('LB' | 'P1')[] = event.keys
  const value: number = event.value
  const duration: number = event.durationMs
  void [keys, value, duration]
  // @ts-expect-error Combo keys are immutable
  event.keys.push('LB')
  // @ts-expect-error Combo payload uses keys, not key
  event.key
})
main.onCombo(
  ['LS', 'TP'],
  INPUT_TYPE.cancel,
  (event) => {
    const reason: string = event.reason
    void reason
    // @ts-expect-error Cancellation has no pressure value
    event.value
  },
  { suppressSingles: true }
)
// @ts-expect-error A combo requires at least two keys
main.onCombo(['S'], 'click', () => {})
// @ts-expect-error Combos do not expose axes
main.onCombo(['LS', 'RS'], 'axes', () => {})
// @ts-expect-error Unknown extension key
main.onCombo(['S', 'P2'], 'click', () => {})
// @ts-expect-error Default manager does not declare extension keys
standardOnly.onCombo(['LB', 'P1'], 'click', () => {})
// @ts-expect-error Shared suppression policy is boolean
main.onCombo(['LB', 'S'], 'down', () => {}, { suppressSingles: 'yes' })
