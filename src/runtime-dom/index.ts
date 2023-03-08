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

function insert(child,parent,anchor) {
  // console.log("insert---------------");
  parent.insertBefore(child,anchor || null)
}

// 移除传入的节点
function remove(child) {
  const parent = child.parentNode
  if(parent) {
    parent.removeChild(child)
  }
}

// 给父节点添加文字
function setElementText(el,text) {
  el.textContent = text
}

const renderer:any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText
})

export function createApp (...args) {
  return renderer.createApp(...args)
}

export * from "../runtime-core";
