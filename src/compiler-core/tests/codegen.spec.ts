import { baseParse } from "../src/parse";
import { generate } from "../src/codegen";
import { transform } from "../src/transform";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");
    transform(ast)
    const { code } = generate(ast);

    // 快照测试（str）
    // 1.对比照片抓bug
    // 2.故意的更新快照
    expect(code).toMatchSnapshot();
  });
});
