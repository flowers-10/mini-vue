import { ShapeFlags } from "@guide-mini-vue/shared";

export function initSlots(instance, children) {
  const { vnode } = instance;
  if (vnode.shapeFlag & ShapeFlags.SOLT_CHILDREN) {
    normalizeObjectSlots((instance.slots = {}), children);
  }
}

// 
function normalizeObjectSlots(slots: any, children: any) {
  for (const key in children) {
    const value = children[key];
    if (typeof value === "function") {
      slots[key] = (props) => normalizeSlotValue(value(props));
    }
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
