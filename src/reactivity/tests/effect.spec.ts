import { effect } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10,
      name:'www',
      newObj:{
        objAge:11
      }
    });
    let nextAge;
    let age2
    effect(() => {
      nextAge =user.age + 1;
    });
    //无法代理深层嵌套的函数
    effect(() => {
      age2 = user.newObj.objAge;
    });
    expect(nextAge).toBe(11);
    user.age++;
    expect(nextAge).toBe(12);
    user.age = 99
    expect(nextAge).toBe(100)

    expect(age2).toBe(11)

    //对于深层嵌套的对象由于没有封装递归的逻辑所以监听不到
    user.newObj.objAge ++
    //理论上来说应该变成12，而结果却没有变化
    expect(age2).toBe(11)

  });
});
