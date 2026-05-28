/// <reference types="vite/client" />

declare module "7z-wasm/7zz.umd.js" {
  const SevenZipFactory: typeof import("7z-wasm").default;
  export default SevenZipFactory;
}
