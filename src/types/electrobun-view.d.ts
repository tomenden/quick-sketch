declare module "electrobun/view" {
  export class Electroview {
    constructor(options?: unknown);
    static defineRPC<TRPC = any>(config: unknown): any;
    rpc: any;
  }

  const Electrobun: {
    Electroview: typeof Electroview;
  };

  export default Electrobun;
}
