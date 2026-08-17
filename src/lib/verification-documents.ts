export const verificationDocumentTypes = [
  { type: "government_id", label: "Government identity" },
  { type: "address_proof", label: "Studio address" },
  { type: "bank_proof", label: "Bank account match" },
  { type: "portfolio_ownership", label: "Portfolio ownership" },
] as const;

export type VerificationDocumentType = (typeof verificationDocumentTypes)[number]["type"];

export function verificationDocumentLabel(type: string) {
  return verificationDocumentTypes.find((item) => item.type === type)?.label ?? type;
}
