import { Action } from './action'
import { Fiber, Forked, Fx } from '@helicopter/core'

// Helper to turn a union into an intersection
type U2I<U> =
  (U extends any ? (u: U) => void : never) extends ((i: infer I) => void) ? I : never

// Readonly key-value pair
export type WithKey<K, V> = K extends string ? Readonly<Record<K, V>> : never

// A Handler is a family of functions which, given an input action A and input sample S,
// produces a new output sample and one or more output actions
export type Handler<E, A, S> = U2I<Interpreters<E, A, A | void, S, S>>
export type PureHandler<A, S> = Handler<never, A, S>

export const dimap = <H extends Handler<any, any, any>, S, A extends StateOf<H>>(f: (s: S) => [A, S], g: (a: A, s: S) => S, h: H): Handler<EnvOf<H>, ActionsOf<H>, S> =>
  Object.keys(h).reduce((hm, k) => {
    (hm as any)[k] = (s: S, a: ActionsOf<H>, fs: ReadonlyArray<Forked>) => {
      const [st, ss] = f(s)
      const r = (h as any)[k](st, a, fs) as Update<EnvOf<H>, ActionsOf<H>, A>
      return r instanceof WithEffects
        ? new WithEffects(g(r.value, ss), r.effects)
        : g(r, ss)
    }
    return hm
  }, {} as Handler<EnvOf<H>, ActionsOf<H>, S>)

export const prop = <H extends Handler<any, any, any>, K extends string, S extends Record<K, StateOf<H>>>(k: K, h: H): Handler<EnvOf<H>, ActionsOf<H>, S> =>
  dimap(s => [s[k], s], (st, s) => ({ ...s, [k]: st }), h)

export type Interpreters<E, A, B, S, T> = A extends Action<infer K, infer AV> ? WithKey<K, Interpreter<E, AV, B, S, T>> : never
export type Interpreter<E, A, B, S, T> = (s: S, a: A, f: ReadonlyArray<Forked>) => Update<E, B, T>
export type Update<E, A, S> = S | WithEffects<S, ReadonlyArray<Fx<E, A>>>

export class WithEffects<A, E> {
  constructor(public readonly value: A, public readonly effects: E) { }
}

export const withEffects = <A, E>(value: A, effects: E): WithEffects<A, E> =>
  new WithEffects(value, effects)

export type Step<E, A, S> = {
  readonly state: S,
  readonly effects: ReadonlyArray<Fx<E, A>>,
  readonly pending: ReadonlyArray<Fiber<A>>
}

// Types that recover the environment, state, and actions of a Handler
export type EnvOf<H> = U2I<{
  readonly [K in keyof H]: H[K] extends Interpreter<infer E, any, any, any, any> ? E : 'EnvOf inferred never'
}[keyof H]>
export type StateOf<H> = U2I<{
  readonly [K in keyof H]: H[K] extends (s: infer S, ...rest: any[]) => any ? S : never
}[keyof H]>
export type ActionsOf<H> = {
  readonly [K in keyof H]: H[K] extends Interpreter<any, infer A, any, any, any> ? Action<K, A> : never
}[keyof H]

export type StepOf<H> = Step<EnvOf<H>, ActionsOf<H>, StateOf<H>>
export type UpdateOf<H> = Update<EnvOf<H>, ActionsOf<H>, StateOf<H>>

export const interpret = <H extends Handler<any, any, any>>(h: H, s: StateOf<H>, a: ActionsOf<H>, f: ReadonlyArray<Forked>): UpdateOf<H> =>
  (h as any)[a.name](s, a.value, f)
