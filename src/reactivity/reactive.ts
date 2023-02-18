import { track, trigger } from "./effect"

export const reactive = (raw) => {
    return new Proxy(raw,{
        get(target,key,receiver) {
            const res =  Reflect.get(target,key,receiver)

            //do something 收集依赖
            track(target,key)
            return res

        },
        set(target,key,value,receiver) {
            const res = Reflect.set(target,key,value,receiver)

            // do somethin 触发依赖
            trigger(target,key)
            return res
        },

    })
}

export const readonly = (raw) => {
    return new Proxy(raw,{
        get(target,key,receiver) {
            const res =  Reflect.get(target,key,receiver)
            return res

        },
        set(target,key,value,receiver) {
            return true
        },

    })
}