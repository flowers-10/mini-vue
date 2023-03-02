import { toHandlerKey, camelize } from "../shared";

export function emit(instance, event, ...args) {
  console.log('emit', event);
  //  instance.props -> event
  const { props } = instance;


  // TPP
  // 先写特定行为 -> 重构通用行为

  //  add-foo -> addFoo
  // 先判断是否是add-foo的字符串，是就返回addFoo
  // 再给addFoo转换成AddFoo
  // 在给AddFoo转换成onAddFoo
  const toHandlerName = toHandlerKey(camelize(event))

  const handler = props[toHandlerName]
  handler && handler(...args)

}