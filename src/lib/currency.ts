export function storeCurrency(): string {
  return process.env.NEXT_PUBLIC_CURRENCY ?? "UGX";
}

export function currencyFractionDigits(currency = storeCurrency()): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function minorToMajor(amount: number, currency = storeCurrency()): number {
  return amount / 10 ** currencyFractionDigits(currency);
}

export function majorToMinor(amount: number, currency = storeCurrency()): number {
  return Math.round(amount * 10 ** currencyFractionDigits(currency));
}
