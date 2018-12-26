export type Cancel = () => void

export const uncancelable = () => {}

export type Fx<H, A> = (handler: H, k: (a: A) => void) => Cancel

export const runFx = <H, A>(fx: Fx<H, A>, handler: H, k: (a: A) => void = () => {}): Cancel =>
  fx(handler, k)

export const pure = <A> (a: A): Fx<unknown, A> =>
  (_, k) => {
    k(a)
    return uncancelable
  }

export const map = <H, A, B> (f: (a: A) => B, fx: Fx<H, A>): Fx<H, B> =>
  (h, kb) => fx(h, a => kb(f(a)))

export const mapTo = <H, A, B> (b: B, fx: Fx<H, A>): Fx<H, B> =>
  map(_ => b, fx)
