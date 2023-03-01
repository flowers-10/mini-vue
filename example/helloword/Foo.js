import { h } from "../../lib/guide-mini-vue.esm";

export const Foo = {
  setup(props) {
    // props包含count
    console.log(props);
  },
  render() {
    return h("div",{},"foo:" + this.count)
  }
}