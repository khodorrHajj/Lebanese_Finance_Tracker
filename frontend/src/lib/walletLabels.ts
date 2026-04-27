import { t } from "@/lib/i18n";
import type { CardType, Locale } from "@/types";

export function getWalletTypeLabel(cardType: CardType, locale: Locale) {
  if (cardType === "Cash_LBP") {
    return t("lbp_wallet", locale);
  }
  if (cardType === "Cash_USD") {
    return t("usd_wallet", locale);
  }
  if (cardType === "Visa") {
    return t("visa_card", locale);
  }
  if (cardType === "Mastercard") {
    return t("mastercard_card", locale);
  }
  if (cardType === "Meza") {
    return t("meza_card", locale);
  }
  return String(cardType);
}
