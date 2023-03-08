import { createRenderer } from '../runtime-core'



function createElement(type) {
  // console.log("createElement-------------");
  
  return document.createElement(type)
}

function patchProp(el, key,prevVal, nextVal) {
  // console.log("patchProp--------------");
  
  const isOn = (key: string) => /^on[A-Z]/.test(key)
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    // 如果新的属性不存在就要删除
    if(nextVal === undefined || nextVal === null) {
      // 删除空值的属性
      el.removeAttribute(key, nextVal)
    }else {
      el.setAttribute(key, nextVal)

    }
  }
}

function insert(el,parent) {
  // console.log("insert---------------");
  
  parent.append(el)
}

const renderer:any = createRenderer({
  createElement,
  patchProp,
  insert
})

export function createApp (...args) {
  return renderer.createApp(...args)
}

export * from "../runtime-core";
