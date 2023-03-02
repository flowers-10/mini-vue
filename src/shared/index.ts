export const extend = Object.assign

export function isObject(val) {
  return val !== null && typeof val === 'object'
}

export const hasChanged = (val, newVal) => {
  return !Object.is(val, newVal)
}

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
