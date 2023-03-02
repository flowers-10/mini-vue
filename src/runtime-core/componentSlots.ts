import { ShapeFlags } from "../shared/ShapeFlags";

export function initSlots(instance, children) {
  const { vnode } = instance;
  // if (vnode.shapeFlag & ShapeFlags.SOLT_CHILDREN) {
    normalizeObjectSlots(instance.slots, children);
  // }
}

function normalizeObjectSlots(slots: any, children: any) {
  //  children object
  for (const key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotValue(value(props));
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
