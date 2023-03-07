import { toHandlerKey, camelize } from "../shared";

export function emit(instance, event, ...args) {
  const { props } = instance;
  const toHandlerName = toHandlerKey(camelize(event))

  const handler = props[toHandlerName]
  handler && handler(...args)
}