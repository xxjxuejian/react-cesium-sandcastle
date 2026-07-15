import { createProdMockServer } from "vite-plugin-mock/client";
import type { MockMethod } from "vite-plugin-mock";

const modules = import.meta.glob("../mock/**/*.ts", {
  eager: true,
  import: "default",
});

const mockModules = Object.values(modules).flat() as MockMethod[];

export async function setupProdMockServer() {
  await createProdMockServer(mockModules);
}
