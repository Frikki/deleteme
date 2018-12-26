import { emptyApp, load, route, Routing, Storage, TodoAction, Todos, updateTodos, withStorage } from './todos'
import { view } from './view'
import { Cancel, fibers, Fx, map, run, runFx } from '../../../src'
import { renderLitHtml } from '../../../src/lit-handler'

const storage = (key: string): Storage => ({
	load (k: (todos: Todos) => void): Cancel {
		const todos = localStorage.getItem(key)
		k(todos == null ? [] : JSON.parse(todos))
		return () => {}
	},
	save (todos: Todos, k: (r: void) => void): Cancel {
		k(localStorage.setItem(key, JSON.stringify(todos)))
		return () => {}
	}
})

const routing: Routing = {
	route (k: (r: string) => void): Cancel {
		const handler = (e: any) => {
			k(window.location.hash.slice(1))
		}
		window.addEventListener('hashchange', handler, { once: true })
		return () => window.removeEventListener('hashchange', handler)
	}
}

const app = run({ update: withStorage(updateTodos), view }, emptyApp, [
	map(filter => ({ action: 'setFilter', filter }) as TodoAction, route()),
	map(todos => ({ action: 'load', todos }) as TodoAction, load())
] as ReadonlyArray<Fx<Routing & Storage, TodoAction>>)

runFx(app, {
	...routing,
	...storage('todos'),
	...renderLitHtml<TodoAction>(document.body),
	...fibers
})