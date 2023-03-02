import { createVnode } from "../vnode";

export function renderSlots(slots, name) {
  const slot = slots[name]

  if (slot) {
    // function
    if(typeof slot === "function") {
      return createVnode("div", {}, slot)

    }
  }
}