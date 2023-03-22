export * from "./toDispalyString"


// 合并对象
export const extend = Object.assign

export const EMPTY_OBJ = {}

// 判断是否是个对象
export const isObject =(val) =>{
  return val !== null && typeof val === 'object'
}

export const isString = (value) => typeof value === "string"


// 判断对象是否改变
export const hasChanged = (val, newVal) => {
  return !Object.is(val, newVal)
}

// 判断对象是否拥有key
export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)

// 转驼峰
export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : ""
  })
}
//   add -> Add 小写转大写
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
// 给Add添加on
export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : ''
}
