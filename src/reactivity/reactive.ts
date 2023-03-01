import { isObject } from "../shared"
import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandlers"

export const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly"
}


export const reactive = (raw) => {
    return createActiveObject(raw, mutableHandlers)
}

export const readonly = (raw) => {
    return createActiveObject(raw, readonlyHandlers)
}

export const shallowReadonly = (raw) => {
    return createActiveObject(raw, shallowReadonlyHandlers)
}

export const isReactive = (value) => {
    return !!value[ReactiveFlags.IS_REACTIVE]
}

export const isReadonly = (value) => {
    return !!value[ReactiveFlags.IS_READONLY]
}

export const isProxy = (value) => {
   return isReactive(value) || isReadonly(value)
}


function createActiveObject(target, baseHandlers) {
    if(!isObject(target)) {
        console.warn(`target${target}必须是一个对象`)
        return target
    }
    return new Proxy(target, baseHandlers)
}