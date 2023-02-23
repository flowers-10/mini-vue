import { hasChanged, isObject } from "../shared"
import { trackEffects, triggerEffects, activeEffect, shouldTrack } from "./effect"
import { isReactive, reactive } from "./reactive"


class RefImpl {
  private _value: any
  public dep
  private _rawValue:any
  public __v_isRef =true
  constructor(value) {
    this._rawValue = value
    this._value = convert(value) 
    this.dep = new Set()
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    // 要先修改value值再触发依赖
    if (hasChanged(newValue,this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue) 
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (activeEffect && shouldTrack) {
    trackEffects(ref.dep)
  }
}



export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !! ref.__v_isRef
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

export function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs,{
    get(target,key) {
      // get 如果是ref类型那么就返回.value的值
      // 如果是普通的值直接返回
      return unRef(Reflect.get(target,key))
    },
    set(target,key,value) {
      // 判断旧值是不是ref，新值是ref还是普通类型
      if(isRef(target[key]) && !isRef(value)) {
        // 普通类型就替换成普通类型
        return target[key].value = value
      }else {
        // 是ref就返回.value的值
        return Reflect.set(target,key,value)
      }
    }
  })
}