/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface UseAutocompleteSuggestionsReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
  isPlacesReady: boolean;
  resetSession: () => void;
}

function isQuotaError(err: unknown): boolean {
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

/**
 * Modern Places API (New) programmatic autocomplete hook using AutocompleteSuggestion
 * and AutocompleteSessionToken with debouncing and race-condition protection.
 */
export function useAutocompleteSuggestions(
  inputString: string,
  enabled: boolean
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputString.trim();

    if (!enabled || !placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current!,
          language: 'id',
          region: 'id',
          // Bias around Central Java / Indonesia (Semarang) while allowing all Indonesian places
          locationBias: {
            center: { lat: -6.9932, lng: 110.4203 },
            radius: 50000,
          },
        };

        const response =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (currentRequestId !== requestIdRef.current) return;
        setSuggestions(response.suggestions ?? []);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          setError('Kuota pencarian Google Maps tercapai.');
        } else {
          setError('Gagal mengambil saran tempat dari Google Maps.');
        }
        setSuggestions([]);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [placesLib, inputString, enabled]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    isPlacesReady: Boolean(placesLib),
    resetSession,
  };
}
