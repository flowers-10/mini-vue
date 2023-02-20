import { extend } from "../shared/extend"
import { isObject } from "../shared/isObject"
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive"

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadOnlyGet = createGetter(true,true)

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      //get捕获器就返回true告诉调用者这是一个reactive对象
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      // 同理返回isReadonly证明是readonly
      return isReadonly
    }


    const res = Reflect.get(target, key)

    //判断shallow，如果是shallow的话，我们直接返回res
    if (shallow) {
      return res
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    if (!isReadonly) {
      track(target, key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const res = Reflect.set(target, key, value, receiver)
    trigger(target, key)
    return res
  }
}

export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value, receiver) {
    console.warn(`key:${key} set失败，因为target是readonly的`, target)
    return true
  },
}

export const shallowReadonlyHandlers = extend({},readonlyHandlers,{
  get:shallowReadOnlyGet
})