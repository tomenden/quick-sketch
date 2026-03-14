declare module "electrobun" {
  export type RPCSchema<T> = T;
  export type ElectrobunConfig = {
    app?: unknown;
    build?: unknown;
    runtime?: unknown;
  };
}
