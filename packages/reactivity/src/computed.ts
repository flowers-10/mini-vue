import { ReactiveEffect } from "./effect";

class computedRefImpl {
  private _getter: any; //保存getter
  private _dirty: boolean = true; //控制计算属性更新
  private _value: any; // 保存run方法返回的value值
  private _effect: any; //保存ReactiveEffect实例
  constructor(getter) {
    this._getter = getter;
    //通过ReactiveEffect类中的scheduler选项实现每次new ReactiveEffect才能更新计算值
    this._effect = new ReactiveEffect(getter, () => {
      // 通过_dirty实现依赖触发更新内容
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }

  get value() {
    // get => get value
    // 当依赖的响应式的对象的值发生改变的时候才会更新
    // effect

    if (this._dirty) {
      this._dirty = false;
      // 获取到 fn 的返回值
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new computedRefImpl(getter);
}
