import { PlaceCategory } from '../types/schedule';

export const PLACE_CATEGORIES: PlaceCategory[] = [
  'Tempat Makan',
  'Potong Rambut & Perawatan',
  'Belanja & Hiburan',
  'Olahraga & Kesehatan',
  'Wisata & Perjalanan',
  'Kantor & Lainnya',
];

const FOOD_PLACE_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'fast_food_restaurant',
  'meal_takeaway',
  'meal_delivery',
  'coffee_shop',
  'ice_cream_shop',
  'indonesian_restaurant',
  'asian_restaurant',
  'chinese_restaurant',
  'japanese_restaurant',
  'seafood_restaurant',
  'steak_house',
  'food_court',
  'food',
]);

const GROOMING_PLACE_TYPES = new Set([
  'barber_shop',
  'hair_salon',
  'hair_care',
  'beauty_salon',
  'spa',
  'skin_care_clinic',
  'nail_salon',
]);

const SHOPPING_ENTERTAINMENT_TYPES = new Set([
  'shopping_mall',
  'department_store',
  'movie_theater',
  'store',
  'supermarket',
  'grocery_store',
  'clothing_store',
  'amusement_center',
  'bowling_alley',
  'arcade',
]);

const SPORT_HEALTH_TYPES = new Set([
  'gym',
  'fitness_center',
  'sports_complex',
  'stadium',
  'sports_club',
  'swimming_pool',
  'hospital',
  'doctor',
  'dentist',
  'pharmacy',
]);

const TRAVEL_TOURISM_TYPES = new Set([
  'tourist_attraction',
  'natural_feature',
  'lodging',
  'hotel',
  'resort_hotel',
  'campground',
  'park',
  'national_park',
  'museum',
  'hindu_temple',
  'buddhist_temple',
  'church',
  'mosque',
  'place_of_worship',
]);

/**
 * Infer Indonesian PlaceCategory from Google Maps Places API (New) primaryType & types.
 */
export function inferCategoryFromGooglePlace(
  primaryType?: string | null,
  types?: string[] | null,
  fallbackName?: string
): PlaceCategory {
  const candidates = [
    ...(primaryType ? [primaryType.toLowerCase()] : []),
    ...(types ? types.map((t) => t.toLowerCase()) : []),
  ];

  for (const t of candidates) {
    if (FOOD_PLACE_TYPES.has(t)) return 'Tempat Makan';
    if (GROOMING_PLACE_TYPES.has(t)) return 'Potong Rambut & Perawatan';
    if (SHOPPING_ENTERTAINMENT_TYPES.has(t)) return 'Belanja & Hiburan';
    if (SPORT_HEALTH_TYPES.has(t)) return 'Olahraga & Kesehatan';
    if (TRAVEL_TOURISM_TYPES.has(t)) return 'Wisata & Perjalanan';
  }

  return inferCategoryFromText(fallbackName || '', '', '');
}

/**
 * Infer Indonesian PlaceCategory from spreadsheet text fields (Lokasi, Catatan, Plan).
 */
export function inferCategoryFromText(
  lokasi: string,
  catatan: string,
  plan: string
): PlaceCategory {
  const combined = `${lokasi} ${catatan} ${plan}`.toLowerCase();

  if (
    /\b(makan|sate|ayam bakar|kfc|resto|cafe|warung|wm\.?|rm\.?|sambel|kopi|bakmi|nasi|kuliner|sarapan|dinner|lunch)\b/.test(
      combined
    )
  ) {
    return 'Tempat Makan';
  }

  if (
    /\b(barbershop|potong rambut|cukur|salon|beauty|wellness|pedicure|manicure|zap|clinic|facial|perawatan|spa|skincare)\b/.test(
      combined
    )
  ) {
    return 'Potong Rambut & Perawatan';
  }

  if (
    /\b(mall|supermall|paragon|dp mall|xxi|bioskop|nonton|cinema|belanja|shopping)\b/.test(
      combined
    )
  ) {
    return 'Belanja & Hiburan';
  }

  if (
    /\b(lari|olahraga|olah raga|gelanggang|gor|tri lomba juang|gym|fitness|renang|jogging|futsal|badminton)\b/.test(
      combined
    )
  ) {
    return 'Olahraga & Kesehatan';
  }

  if (
    /\b(trip|dieng|wisata|pantai|gunung|vihara|candi|hotel|villa|liburan|mancing|pemancingan)\b/.test(
      combined
    )
  ) {
    return 'Wisata & Perjalanan';
  }

  return 'Kantor & Lainnya';
}

export function normalizePlaceCategory(
  raw: string | undefined,
  lokasi: string,
  catatan: string,
  plan: string
): PlaceCategory {
  const trimmed = (raw || '').trim();
  const match = PLACE_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;
  return inferCategoryFromText(lokasi, catatan, plan);
}
