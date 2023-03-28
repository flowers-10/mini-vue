import {
  isReadonly,
  isReactive,
  shallowReadonly,
  readonly,
} from "../src/reactive";
import { vi } from "vitest";
describe("shallowReadonly", () => {
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    const readonlyProps = readonly({ n: { foo: 1 } });
    expect(isReadonly(props)).toBe(true);
    //readonly深层的对象也是只读的
    expect(isReadonly(readonlyProps.n)).toBe(true);
    // shallowReadonly深层对象是可以set的
    expect(isReadonly(props.n)).toBe(false);
    // shallowReadonly深层对象不是响应式对象
    expect(isReactive(props.n)).toBe(false);
  });

  it("should call console.warn when set", () => {
    console.warn = vi.fn();
    const user = shallowReadonly({
      age: 10,
    });
    user.age = 11;
    expect(console.warn).toBeCalled();
  });
});
