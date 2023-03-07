import { createVnode } from "../vnode";

// 用户主动传入参数去渲染组件
// 这个函数相当于 template中的 <slot/>标签，是一个占位符
// 所以renderSlots在子组件的哪个位置，vue就会把插槽渲染到哪里
export function renderSlots(slots, name,props) {
  // 具名插槽
  const slot = slots[name]
  if (slot) {
    // function
    if(typeof slot === "function") {
      // 返回一个插槽的虚拟节点,props是作用域插槽的实现
      return createVnode("div", {}, slot(props))
    } 
  }
}