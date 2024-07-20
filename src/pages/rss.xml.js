import rss from "@astrojs/rss";
import { getSinglePage } from "@/lib/contentParser.astro";
import config from "@/config/config.json";

const { title, description } = config.site;

export async function GET(context) {
  const posts = await getSinglePage("blog");
  return rss({
    title: title,
    description: description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.slug}/`,
    })),
  });
}
