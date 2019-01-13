import { ActionsOf, Cancel, Fiber, fibers, Fx, kill, Maybe, runApp, runFx } from '../../src'
import { renderLitHtml } from '../../src/lit-html-view'
import { html } from 'lit-html'

//-------------------------------------------------------
type Count = { count: number }
// An interpreter (i.e. implementation) for the counter app
const counter = {
  inc: (c: Count) => ({ state: { count: c.count + 1 } }),
  dec: (c: Count) => ({ state: { count: c.count - 1 } })
}

//-------------------------------------------------------
const reset = {
  reset: () => ({ state: { count: 0 } })
}

//-------------------------------------------------------
type Delay = {
  delay: <A> (a: A, ms: number, k: (r: A) => void) => Cancel
}

const delay = <A>(a: A, ms: number): Fx<Delay, A> =>
  ({ delay }, k) => delay(a, ms, k)

type DelayedCount = Count & { delayed: number }

const delayCounter = {
  delay: (ms: number) => (c: DelayedCount) => ({
    state: { delayed: c.delayed + 1 },
    effects: [delay(delayCounter.handleDelay, ms)]
  }),
  handleDelay: (c: DelayedCount) => ({
    state: { count: c.count + 1, delayed: c.delayed - 1 }
  }),
  cancelDelays: (c: DelayedCount, delays: ReadonlyArray<Fiber<unknown>>) => ({
    state: { delayed: 0 },
    effects: delays.map(kill)
  })
}

//-------------------------------------------------------
const app = { ...counter, ...reset, ...delayCounter }

//-------------------------------------------------------
// A view that uses capabilities of counter, reset, and delayCounter
const view = ({ inc, dec, reset, delay, cancelDelays }: typeof app, { count, delayed }: DelayedCount) => html`
  <p>count: ${count} (delayed: ${delayed})</p>
  <p>
    <button @click=${() => inc}>+</button>
    <button @click=${() => dec}>-</button>
    <button @click=${()=> reset} ?disabled=${count === 0}>Reset</button>
  </p>
  <p>
    <button @click=${()=> delay(1000)}>+ Delay</button>
    <button @click=${() => cancelDelays} ?disabled=${delayed === 0}>Cancel Delays</button>
  </p>
`

//-------------------------------------------------------
const appFx = runApp(app, view, { count: 0, delayed: 0 })

runFx(appFx, {
  ...fibers,
  ...renderLitHtml<Maybe<ActionsOf<typeof app>>>(document.body),
  delay: <A>(a: A, ms: number, k: (r: A) => void): Cancel => {
    const t = setTimeout(k, ms, a)
    return () => clearTimeout(t)
  }
})
