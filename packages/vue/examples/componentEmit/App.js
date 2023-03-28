import { h } from "../../dist/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

window.self = null
export const App = {
  name: "App",
  render() {
    window.self = this
    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        //  on + Event
        onAdd(a,b) {
          console.log("onAdd",a,b);
        },
        onAddFoo() {
          console.log("onAddFoo");
        }
      }),
    ]);
  },
  setup() {
    return {};
  },
};
