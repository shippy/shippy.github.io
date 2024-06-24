import type { CollectionEntry } from "astro:content";

interface OptionProps {
  filterOutDrafts?: boolean;
  filterOutFuture?: boolean;
  sortByDate?: boolean;
  limit?: number;
}

export function formatBlogPosts(
  posts: CollectionEntry<"blog">[],
  {
    filterOutDrafts = true,
    filterOutFuture = true,
    sortByDate = true,
    limit = undefined,
  }: OptionProps = {}
) {
  // sortByDate or randomize
  if (sortByDate) {
    posts.sort(
      //@ts-ignore
      (a, b) => new Date(b.data.date) - new Date(a.data.date)
    );
  } else {
    posts.sort(() => Math.random() - 0.5);
  }

  // limit if number is passed
  if (typeof limit === "number") {
    return posts.slice(0, limit);
  }
  return posts;
}
