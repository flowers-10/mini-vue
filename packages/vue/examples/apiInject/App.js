import { h, provide, inject } from "../../dist/guide-mini-vue.esm.js";

const Provide = {
  name: "Provide",
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(ProvideTwo)]);
  },
};

const ProvideTwo = {
  name: "ProvideTwo",
  setup() {
    provide("foo", "fooValTwo");
    const foo = inject("foo");
    return {
      foo
    }
  },
  render() {
    return h("div", {}, [h("p", {}, `ProvideTwo foo:${this.foo}` ), h(Consumer)]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz",() => "bazDefaultValue");
    return {
      foo,
      bar,
      baz
    };
  },
  render() {
    return h("div", {}, `Consumer: - ${this.foo} - ${this.bar} - ${this.baz}`);
  },
};

export default {
  name:"App",
  setup() {

  },
  render() {
    return h("div",{},[h(Provide)])
  }
}
