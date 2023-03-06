import { toHandlerKey, camelize } from "../shared";

// 用户往emit中传入一个事件名，还有若干参数
export function emit(instance, event, ...args) {
  // console.log('emit', event);
  //  instance.props -> event
  const { props } = instance;


  // TPP
  // 先写特定行为 -> 重构通用行为
  // 先camelize，把-后面的第一个字符转大写 （例如  add-foo -> addFoo）
  // toHandlerKey给事件加上on并且on后面的第一个字符大写(例如 addFoo转换成AddFoo,在给AddFoo转换成onAddFoo)
  const toHandlerName = toHandlerKey(camelize(event))

  // 得到用户传入的emit函数（例如 props[onAddFoo])
  const handler = props[toHandlerName]
  // 调用emit
  handler && handler(...args)
}