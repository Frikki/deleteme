import { App, run } from './app'
import { delay, Effect } from './effect'
import { Fiber, killWith } from './fiber'
import { render } from './lit'
import { html } from 'lit-html'

type CounterAction = 'inc' | 'dec' | 'reset count' | 'delay' | 'cancel delays' | 'none'

type CounterState = {
  count: number,
  delayed: number
}

const counterView = ({ count, delayed }: CounterState) => html`
  <p>${count} (delayed: ${delayed})
    <button @click=${'inc'}>+</button>
    <button @click=${'dec'}>-</button>
    <button @click=${'reset count'} ?disabled=${count === 0}>Reset Count</button>
    <button @click=${'delay'}>Delay +</button>
    <button @click=${'cancel delays'} ?disabled=${delayed === 0}>Cancel Delays</button>
  </p>
`

const counter = (s: CounterState, a: CounterAction, fs: ReadonlyArray<Fiber<CounterAction>>): [CounterState, ReadonlyArray<Effect<CounterAction>>] => {
  switch (a) {
    case 'inc': return [{ count: s.count + 1, delayed: fs.length }, []]
    case 'dec': return [{ count: s.count - 1, delayed: fs.length }, []]
    case 'reset count': return [{ count: 0, delayed: fs.length }, []]
    case 'delay':
      const d = delay(1000, 'inc' as CounterAction)
      return [{ ...s, delayed: fs.length + 1 }, [d]]
    case 'cancel delays': return [{ ...s, delayed: 0 }, fs.map(f => killWith('none', f))]
    default: return [s, []]
  }
}

const app: App<CounterState, CounterAction> = {
  updateState: counter,
  updateView: s => render(counterView(s), document.body)
}

run(app, { count: 0, delayed: 0 })
