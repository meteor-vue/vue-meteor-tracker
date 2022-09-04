import { Tracker } from 'meteor/tracker'
import { Meteor } from 'meteor/meteor'
import { App, computed, ComputedRef, getCurrentInstance, markRaw, onUnmounted, reactive, ref, watch, watchEffect } from 'vue'

export const config = {
  subscribe: Meteor.subscribe,
}

interface Stoppable {
  stop: () => void
}

export interface AutorunEffect<TResult> extends Stoppable {
  result: ComputedRef<TResult>
}

function autorun<TResult = unknown> (callback: () => TResult): AutorunEffect<TResult> {
  const result = ref<TResult>()
  const stop = watchEffect((onInvalidate) => {
    const computation = Tracker.autorun(() => {
      let value: any = callback()
      if (typeof value?.fetch === 'function') {
        value = value.fetch()
      }
      result.value = value && typeof value === 'object' ? markRaw(value as unknown as object) as TResult : value
    })
    onInvalidate(() => {
      computation.stop()
    })
  })
  return {
    result: computed<TResult>(() => result.value as TResult),
    stop,
  }
}

export interface ReactiveMeteorSubscription extends Stoppable {
  ready: ComputedRef<boolean>
}

function subscribe (payload: string | (() => [name: string, ...args: any[]]), ...args: any[]): ReactiveMeteorSubscription {
  if (typeof payload === 'string') {
    return simpleSubscribe(payload, ...args)
  } else {
    return watchSubscribe(payload)
  }
}

function simpleSubscribe (name: string, ...args: any[]): ReactiveMeteorSubscription {
  const sub = config.subscribe(name, ...args)
  const ready = autorun(() => sub.ready())

  function stop (): void {
    ready.stop()
    sub.stop()
  }

  getCurrentInstance() && onUnmounted(() => {
    stop()
  })

  return {
    stop,
    ready: ready.result,
  }
}

function watchSubscribe (callback: () => [name: string, ...args: any[]]): ReactiveMeteorSubscription {
  const ready = ref(false)
  const stop = watch(callback, (value, oldValue, onInvalidate) => {
    const sub = config.subscribe(...value)

    const computation = Tracker.autorun(() => {
      ready.value = sub.ready()
    })

    onInvalidate(() => {
      sub.stop()
      computation.stop()
    })
  }, {
    immediate: true,
    deep: true,
  })

  return {
    stop,
    ready: computed(() => ready.value),
  }
}

function makeComposable <
  TName extends string = string,
  TReturn extends Stoppable = Stoppable,
  TFn extends (...args: any[]) => TReturn = (...args: any[]) => TReturn
> (name: TName, fn: TFn): () => {
  [K in TName]: TFn
} {
  return () => {
    const effects: Stoppable[] = []

    const _run = ((...args) => {
      const effect = fn(...args)
      effects.push(effect)
      return effect
    }) as TFn

    onUnmounted(() => {
      effects.forEach(effect => effect.stop())
    })

    return {
      [name]: _run,
    } as {
      [K in TName]: TFn
    }
  }
}

export const useAutorun = makeComposable<'autorun', ReturnType<typeof autorun>, typeof autorun>('autorun', autorun)
export const useSubscribe = makeComposable<'subscribe', ReturnType<typeof subscribe>, typeof subscribe>('subscribe', subscribe)

function makeSetupOnlyFunction <
  TFn extends (...args: any[]) => any
> (fn: TFn): TFn {
  return ((...args) => {
    if (process.env.NODE_ENV !== 'production') {
      if (!getCurrentInstance()) {
        console.warn(`'${fn.name}()' should only be used in setup() inside components to clean up correctly. If you need to call '${fn.name}' later outside of the setup context, use 'use${fn.name[0].toUpperCase()}${fn.name.slice(1)}()' instead.`)
      }
    }
    return fn(...args)
  }) as TFn
}

const setupOnlyAutorun = makeSetupOnlyFunction(autorun)
const setupOnlySubscribe = makeSetupOnlyFunction(subscribe)

export {
  setupOnlyAutorun as autorun,
  setupOnlySubscribe as subscribe,
}

export function callMethod<
  TResult = any
> (methodName: string, ...args: any[]): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    Meteor.call(methodName, ...args, (err: Error, res: TResult) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

export type MethodResultCallback<TResult = any> = (error: Error | undefined, result: TResult | undefined) => unknown

export function useMethod <TArgs extends any[] = any[], TResult = any> (name: string) {
  const pending = ref(false)
  const error = ref<Error>()
  const result = ref<TResult>()
  const callbacks: MethodResultCallback<TResult>[] = []

  async function _call (...args: TArgs) {
    pending.value = true
    error.value = undefined
    try {
      result.value = await callMethod(name, ...args)
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
      callbacks.forEach(callback => callback(error.value, result.value))
    }
  }

  function onResult (callback: MethodResultCallback<TResult>) {
    callbacks.push(callback)
  }

  return {
    call: _call,
    pending,
    error,
    onResult,
  }
}

export const VueMeteor = {
  install (app: App) {
    app.mixin({
      beforeCreate () {
        if (this.$options.meteor) {
          const subReady = reactive<Record<string, boolean>>({})

          if (this.$options.meteor.$subscribe) {
            for (const key in this.$options.meteor.$subscribe) {
              const value = this.$options.meteor.$subscribe[key]
              const { ready } = typeof value === 'function'
                ? subscribe(() => {
                  const result = value.call(this)
                  return [key, ...result]
                })
                : subscribe(key, ...value)
              // @ts-expect-error unwrapping
              subReady[key] = ready
            }
          }

          this.$options.computed = this.$options.computed || {}
          this.$options.computed.$subReady = () => subReady

          const { subscribe: $subscribe } = useSubscribe()
          this.$options.methods = this.$options.methods || {}
          this.$options.methods.$subscribe = $subscribe

          for (const key in this.$options.meteor) {
            if (key.startsWith('$')) continue
            const fn = this.$options.meteor[key]
            const { result } = autorun(fn)
            this.$options.computed[key] = () => result.value
          }
        }
      },
    })
  },
}
