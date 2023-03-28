import { hasChanged, isObject } from "@guide-mini-vue/shared"
import { trackEffects, triggerEffects, activeEffect, shouldTrack } from "./effect"
import { isReactive, reactive } from "./reactive"


class RefImpl {
  private _value: any //保存传入的值并判断是否对象，对象就reactive
  public dep //收集依赖
  private _rawValue:any //保存每次传入的值
  public __v_isRef =true //判断是否时ref的开关
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

// 在get操作时有效控制依赖收集
function trackRefValue(ref) {
  if (activeEffect && shouldTrack) {
    // 把dep传入，开始依赖收集
    trackEffects(ref.dep)
  }
}



export function ref(value) {
  return new RefImpl(value)
}

// 根据对象中是否存在__v_isRef判断是否是个ref的对象，因为普通对象没有这个属性，只有ref创建时才会给对象里加入这个属性
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