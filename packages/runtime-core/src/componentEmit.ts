import { toHandlerKey, camelize } from "@guide-mini-vue/shared";

export function emit(instance, event, ...args) {
  const { props } = instance;
  const toHandlerName = toHandlerKey(camelize(event))

  const handler = props[toHandlerName]
  handler && handler(...args)
}