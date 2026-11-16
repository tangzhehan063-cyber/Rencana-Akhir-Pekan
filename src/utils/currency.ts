/// <reference types="google.maps" />

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoney(money: google.maps.places.Money): string {
  const value = (money.units || 0) + (money.nanos || 0) / 1e9;
  const currency = money.currencyCode || 'IDR';
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('id-ID')}`;
  }
}

const PRICE_LEVEL_LABELS: Record<string, string> = {
  FREE: 'Gratis',
  INEXPENSIVE: 'Terjangkau ($)',
  MODERATE: 'Menengah ($$)',
  EXPENSIVE: 'Mahal ($$$)',
  VERY_EXPENSIVE: 'Sangat Mahal ($$$$)',
  Free: 'Gratis',
  Inexpensive: 'Terjangkau ($)',
  Moderate: 'Menengah ($$)',
  Expensive: 'Mahal ($$$)',
  'Very Expensive': 'Sangat Mahal ($$$$)',
};

export function formatPriceLevelLabel(priceLevel?: string | null): string | undefined {
  if (!priceLevel) return undefined;
  return PRICE_LEVEL_LABELS[priceLevel] || priceLevel;
}

export interface ExtractedGooglePrice {
  mapsPriceLevel?: string;
  mapsPriceRangeLabel?: string;
  mapsPriceAvg?: number;
  mapsPriceCurrency?: string;
}

export function extractGooglePrice(place: google.maps.places.Place): ExtractedGooglePrice {
  const mapsPriceLevel = formatPriceLevelLabel(place.priceLevel ?? null);
  let mapsPriceRangeLabel: string | undefined;
  let mapsPriceAvg: number | undefined;
  let mapsPriceCurrency: string | undefined;

  const range = place.priceRange;
  if (range && range.startPrice) {
    const startVal = (range.startPrice.units || 0) + (range.startPrice.nanos || 0) / 1e9;
    mapsPriceCurrency = range.startPrice.currencyCode || 'IDR';

    if (range.endPrice) {
      const endVal = (range.endPrice.units || 0) + (range.endPrice.nanos || 0) / 1e9;
      mapsPriceRangeLabel = `${formatMoney(range.startPrice)} – ${formatMoney(range.endPrice)} / orang`;
      mapsPriceAvg = Math.round((startVal + endVal) / 2);
    } else {
      mapsPriceRangeLabel = `Mulai ${formatMoney(range.startPrice)} / orang`;
      mapsPriceAvg = Math.round(startVal);
    }
  }

  return {
    mapsPriceLevel,
    mapsPriceRangeLabel,
    mapsPriceAvg,
    mapsPriceCurrency,
  };
}
