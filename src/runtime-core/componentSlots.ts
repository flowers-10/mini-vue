import { ShapeFlags } from "../shared/ShapeFlags";

// 初始化插槽
export function initSlots(instance, children) {
  const { vnode } = instance;
  // 判断标记是否命中插槽，不是就不用初始化插槽
  if (vnode.shapeFlag & ShapeFlags.SOLT_CHILDREN) {
    // normalize插槽
    normalizeObjectSlots((instance.slots = {}), children);
  }
}

// 
function normalizeObjectSlots(slots: any, children: any) {
  //  children object
  for (const key in children) {
    const value = children[key];
    if (typeof value === "function") {
      // 把这个函数给到slots 对象上存起来
      // 后续在 renderSlots 中调用
      // TODO 这里没有对 value 做 normalize，
      // 默认 slots 返回的就是一个 vnode 对象
      slots[key] = (props) => normalizeSlotValue(value(props));
    }
  }
}

// 判断是否是Array，不是就给一个数组包裹起来
// 主要是用于解决多插槽，具名插槽的需求
function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
