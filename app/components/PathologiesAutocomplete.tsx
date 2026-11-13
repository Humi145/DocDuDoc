'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';

type PathologiesAutocompleteProps = {
  id: string;
  name: string;
  defaultValue?: string;
  className: string;
  required?: boolean;
  maxLength?: number;
};

type Suggestion = {
  label: string;
  normalizedLabel: string;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
}

export default function PathologiesAutocomplete({
  id,
  name,
  defaultValue = '',
  className,
  required,
  maxLength,
}: PathologiesAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSuggestions() {
      try {
        const response = await fetch('/api/pathologies/autocomplete', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Impossible de charger la liste des pathologies.');
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every((item) => typeof item === 'string')) {
          throw new Error('La liste des pathologies reçue est invalide.');
        }

        setSuggestions(
          data.map((label: string) => ({
            label,
            normalizedLabel: normalize(label),
          })),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erreur lors du chargement des suggestions :', error);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Une erreur inattendue est survenue.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchSuggestions();
    return () => controller.abort();
  }, []);

  const filteredSuggestions = useMemo(() => {
    const search = normalize(query.trim());
    if (!search) {
      return [];
    }

    const startsWith = suggestions.filter((item) =>
      item.normalizedLabel.startsWith(search),
    );
    const contains = suggestions.filter(
      (item) =>
        !item.normalizedLabel.startsWith(search) &&
        item.normalizedLabel.includes(search),
    );
    return [...startsWith, ...contains].slice(0, 8);
  }, [query, suggestions]);

  function selectSuggestion(suggestion: Suggestion) {
    setQuery(suggestion.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        index < filteredSuggestions.length - 1 ? index + 1 : 0,
      );
    } else if (event.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        index > 0 ? index - 1 : filteredSuggestions.length - 1,
      );
    } else if (
      event.key === 'Enter' &&
      isOpen &&
      activeIndex >= 0 &&
      filteredSuggestions[activeIndex]
    ) {
      event.preventDefault();
      selectSuggestion(filteredSuggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        placeholder="Saisir le nom d’une pathologie"
        autoComplete="off"
        required={required}
        maxLength={maxLength}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && filteredSuggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={
          isOpen && activeIndex >= 0
            ? `${id}-suggestion-${activeIndex}`
            : undefined
        }
      />

      {isLoading && query.trim() && (
        <p role="status" className="mt-1 text-sm text-(--foreground)/70">
          Chargement des suggestions…
        </p>
      )}
      {loadError && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {loadError}
        </p>
      )}
      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--foreground)/20 bg-white py-1 shadow-lg"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.label}-${index}`}
              id={`${id}-suggestion-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(suggestion)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                activeIndex === index
                  ? 'bg-(--primary)/10'
                  : 'hover:bg-(--primary)/10'
              }`}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
