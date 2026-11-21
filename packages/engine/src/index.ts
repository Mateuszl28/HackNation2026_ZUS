export * from "./params.ts";
export * from "./calculator.ts";
export * from "./cases.ts";
export * from "./support.ts";
export * from "./parser.ts";

export const pln = (n: number) =>
  n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 });
export * from "./planning.ts";
export * from "./assistant.ts";
export * from "./base.ts";
export * from "./pregnancy.ts";
export * from "./checklist.ts";
export * from "./employer.ts";
export * from "./decision.ts";
export * from "./whatif.ts";
