import { effect } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10,
      name: "www",
      newObj: {
        objAge: 11,
      },
    });
    let nextAge;
    let age2;
    effect(() => {
      nextAge = user.age + 1;
    });
    //无法代理深层嵌套的函数
    effect(() => {
      age2 = user.newObj.objAge;
    });
    expect(nextAge).toBe(11);
    user.age++;
    expect(nextAge).toBe(12);
    user.age = 99;
    expect(nextAge).toBe(100);

    expect(age2).toBe(11);

    //对于深层嵌套的对象由于没有封装递归的逻辑所以监听不到
    user.newObj.objAge++;
    //理论上来说应该变成12，而结果却没有变化
    expect(age2).toBe(11);
  });

  it("should return runner when call effect", () => {
    //1.effect(fn) => function (runner) => fn => return
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return "foo";
    });
    expect(foo).toBe(11);
    const r = runner();
    expect(foo).toBe(12);
    expect(r).toBe("foo");
  });

  it("scheduler",() => {
    // 1.通过 effect 的第二个参数给定一个 scheduler （是一个函数类型的参数）
    // 2. effect 第一次执行的时候 还会执行scheduler 这个 函数
    // 3. 当响应式对象 set update 不会执行第一个参数的 fn 而是 执行第二个 scheduler 的函数
    let dummy;
    let run :any;
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({foo:1})
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {scheduler}
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    //should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    //should not run yet
    expect(dummy).toBe(1)
    //manually run
    run()
    //should have run
    expect(dummy).toBe(2)
  })
});
