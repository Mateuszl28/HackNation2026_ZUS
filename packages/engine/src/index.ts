export * from "./params.ts";
export * from "./calculator.ts";
export * from "./cases.ts";
export * from "./support.ts";
export * from "./parser.ts";

export const pln = (n: number) =>
  n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 });
export * from "./planning.ts";
export * from "./assistant.ts";
