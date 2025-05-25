import rss from "@astrojs/rss";
import { getSinglePage } from "@/lib/contentParser.astro";
import config from "@/config/config.json";
import { getCollection } from "astro:content";

const { title, description } = config.site;

const getAllContent = async () => {
  const posts = await getCollection("blog");
  const talks = await getCollection("presentations");
  const podcasts = await getCollection("podcasts");
  const sideProjects = await getCollection("side_projects");
  // For each variable above, sort them by pubDate (or date if pubDate is not present), and assign them a link. The link prefix is the type of the object.
  const sorted = [...posts, ...talks, ...podcasts, ...sideProjects].sort((a, b) => {
    const dateA = a.data.pubDate?.valueOf() || a.data.date?.valueOf();
    const dateB = b.data.pubDate?.valueOf() || b.data.date?.valueOf();
    return dateB - dateA;
  });
  sorted.forEach((item) => {
    item.link = item.data.podcastUrl? item.data.podcastUrl : `/${item.collection}/${item.slug}/`;
  });
  return sorted;
}

export async function GET(context) {
  const posts = await getAllContent();
  return rss({
    title: title,
    description: description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: post.link,
    })),
  });
}
