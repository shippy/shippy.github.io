import type { CollectionEntry } from "astro:content";

interface OptionProps {
  sortByDate?: boolean;
  sortParams?: string;
  limit?: number;
}

export function formatCollection<Type>(
  collection: Type[],
  {
    sortByDate = true,
    sortParams = "date",
    limit = undefined,
  }: OptionProps = {},
) {
  // sortByDate or randomize
  if (sortByDate) {
    collection.sort(
      //@ts-ignore
      (a, b) => new Date(b.data[sortParams]) - new Date(a.data[sortParams]),
    );
  } else {
    collection.sort(() => Math.random() - 0.5);
  }

  // limit if number is passed
  if (typeof limit === "number") {
    return collection.slice(0, limit);
  }
  return collection;
}
