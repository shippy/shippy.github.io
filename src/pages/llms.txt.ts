import { getEntryBySlug, getEntry, getCollection } from "astro:content";

const piece = async (slug: string) => await getEntry("llms_txt", slug);

export const prerender = true;

export async function GET() {
  const header = await piece("header");
  const biography = await piece("biography");
  const significance = await piece("significance");
  const offers = await piece("offers");
  const contact = await piece("contact");

  const [posts, talks, podcasts, sideProjects] = await Promise.all([
    getCollection("blog"),
    getCollection("presentations"),
    getCollection("podcasts"),
    getCollection("side_projects"),
  ]);

  const latest = (arr: any[], count: number, dateField: string = "pubDate") =>
    arr
      .sort((a, b) => b.data[dateField].valueOf() - a.data[dateField].valueOf())
      .slice(0, count);

  const renderSummary = (entry: any) => {
    return "- " + entry.data.title + " (" + (entry.data.pubDate?.toISOString().slice(0,10) || entry.data.date?.toISOString().slice(0,10)) + "): " + entry.data.description;
  }

  const out = [
    header?.body || '',
    biography?.body || '',
    significance?.body || '',
    offers?.body || '',
    contact?.body || '',
    "## Latest Content (for all, see https://simon.podhajsky.net/rss.xml)",
    "### Latest Posts (for all, see https://simon.podhajsky.net/blog/)",
    ...latest(posts, 4, "date").map(post => renderSummary(post)),
    "### Latest Talks (for all, see https://simon.podhajsky.net/presentations/)",
    ...latest(talks, 3).map(talk => renderSummary(talk)),
    "### Latest Podcasts (for all, see https://simon.podhajsky.net/podcasts/)",
    ...latest(podcasts, 3).map(podcast => renderSummary(podcast)),
    "### Latest Side Projects (for all, see https://simon.podhajsky.net/side-projects/)",
    ...latest(sideProjects, 3).map(sideProject => renderSummary(sideProject)),
  ];

  return new Response(out.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
