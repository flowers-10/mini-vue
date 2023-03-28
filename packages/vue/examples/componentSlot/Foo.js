import { h, renderSlots } from "../../dist/guide-mini-vue.esm.js";

export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h("p", {}, "foo");
    // 在父组件内插入了新标签，我们可以把父组件内的chilren拿到
    // 存进$slots里，并在子组件内部渲染即可
    // Foo .vnode. chilidren

    console.log(this.$slots);
    // 如果slot是多个标签，那么又要重新转vnode才行
    // renderSlots
    // 具名插槽
    // 1.获取到要渲染的元素
    // 2.获取到渲染的位置
    // 作用域插槽
    const age = 18;
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
