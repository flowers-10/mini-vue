import { baseParse } from "../src/parse";
import { generate } from "../src/codegen";
import { transform } from "../src/transform";
import { transformExpression } from "../src/transforms/transformExpression";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");
    transform(ast);
    const { code } = generate(ast);

    // 快照测试（str）
    // 1.对比照片抓bug
    // 2.故意的更新快照
    expect(code).toMatchSnapshot();
  });

  it("interpolation", () => {
    const ast = baseParse("{{message}}");
    transform(ast, {
      nodeTransforms: [transformExpression],
    });
    const { code } = generate(ast);

    expect(code).toMatchSnapshot();
  });
});
