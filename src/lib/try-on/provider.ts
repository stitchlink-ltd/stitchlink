import "server-only";

export type TryOnRequest = { personImagePath: string; garmentImagePath: string; orderId: string };
export type TryOnResult = { providerJobId: string; status: "processing" | "completed"; previewPath?: string; disclaimer: string };

export interface TryOnProvider { createPreview(input: TryOnRequest): Promise<TryOnResult>; }

class DemoTryOnProvider implements TryOnProvider {
  async createPreview(input: TryOnRequest): Promise<TryOnResult> {
    return { providerJobId: `demo_${crypto.randomUUID()}`, status: "completed", previewPath: input.garmentImagePath, disclaimer: "Experimental concept preview — not a fit or final-product guarantee." };
  }
}

export function getTryOnProvider(): TryOnProvider { return new DemoTryOnProvider(); }
