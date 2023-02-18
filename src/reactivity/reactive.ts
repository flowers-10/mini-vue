import { mutableHandlers, readonlyHandlers } from "./baseHandlers"



export const reactive = (raw) => {
    return createActiveObject(raw, mutableHandlers)
}

export const readonly = (raw) => {
    return createActiveObject(raw, readonlyHandlers)
}

function createActiveObject(raw,readonlyHandlers) {
    return new Proxy(raw, readonlyHandlers)
}