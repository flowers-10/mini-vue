import { h } from "../../dist/guide-mini-vue.esm.js";

export const Foo = {
  setup(props) {
    // props包含count
    console.log(props);
    // 3.
    // readonly
    props.count++;
    console.log(props);
  },
  render() {
    return h("div", {}, "foo: " + this.count);
  },
};
