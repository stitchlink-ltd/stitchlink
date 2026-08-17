export type MarketplaceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
export const marketplaceInitialState: MarketplaceActionState = { status: "idle" };
