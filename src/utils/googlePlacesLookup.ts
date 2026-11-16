/// <reference types="google.maps" />
import { PlaceCategory } from '../types/schedule';
import { inferCategoryFromGooglePlace } from './categories';
import { extractGooglePrice } from './currency';

export interface ResolvedGooglePlaceData {
  lokasi: string;
  alamat?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  kategori: PlaceCategory;
  mapsPriceLevel?: string;
  mapsPriceRangeLabel?: string;
  mapsPriceAvg?: number;
  mapsPriceCurrency?: string;
}

export function isGoogleQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : JSON.stringify(err || '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

const BASE_FIELDS = [
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'types',
  'id',
  'priceLevel',
];

const RICH_FIELDS = [...BASE_FIELDS, 'priceRange'];

export async function fetchPlaceDetailsWithPrice(
  place: google.maps.places.Place,
  fallbackName: string
): Promise<ResolvedGooglePlaceData> {
  try {
    await place.fetchFields({ fields: RICH_FIELDS });
  } catch (err) {
    if (isGoogleQuotaError(err)) throw err;
    // Fallback if priceRange is unsupported on a specific channel/place
    await place.fetchFields({ fields: BASE_FIELDS });
  }

  const resolvedName = place.displayName || fallbackName;
  const priceData = extractGooglePrice(place);
  const kategori = inferCategoryFromGooglePlace(
    place.primaryType,
    place.types,
    resolvedName
  );

  return {
    lokasi: resolvedName,
    alamat: place.formattedAddress || undefined,
    placeId: place.id || undefined,
    lat: place.location ? place.location.lat() : undefined,
    lng: place.location ? place.location.lng() : undefined,
    kategori,
    ...priceData,
  };
}

export async function searchPlaceByNameWithPrice(
  placesLib: google.maps.PlacesLibrary,
  query: string
): Promise<ResolvedGooglePlaceData | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const baseRequest = {
    textQuery: trimmed,
    locationBias: { lat: -6.9932, lng: 110.4203 },
    language: 'id',
    region: 'id',
    maxResultCount: 1,
    internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
  };

  let places: google.maps.places.Place[] = [];
  try {
    const res = await placesLib.Place.searchByText({
      ...baseRequest,
      fields: RICH_FIELDS,
    });
    places = res.places ?? [];
  } catch (err) {
    if (isGoogleQuotaError(err)) throw err;
    const res = await placesLib.Place.searchByText({
      ...baseRequest,
      fields: BASE_FIELDS,
    });
    places = res.places ?? [];
  }

  const place = places[0];
  if (!place) return null;

  const resolvedName = place.displayName || trimmed;
  const priceData = extractGooglePrice(place);
  const kategori = inferCategoryFromGooglePlace(
    place.primaryType,
    place.types,
    resolvedName
  );

  return {
    lokasi: resolvedName,
    alamat: place.formattedAddress || undefined,
    placeId: place.id || undefined,
    lat: place.location ? place.location.lat() : undefined,
    lng: place.location ? place.location.lng() : undefined,
    kategori,
    ...priceData,
  };
}
