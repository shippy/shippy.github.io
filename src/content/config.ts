import { defineCollection, reference, z, type ImageFunction } from "astro:content";

// Legacy collections
const contactCollection = defineCollection({})
const homepageCollection = defineCollection({})

// LLM meta collection schema
const llmsMetaCollection = defineCollection({})

// Blog collection schema
const blogsCollection = defineCollection({
  type: "content",
  schema: ({ image }: { image: ImageFunction }) =>
    z.object({
      id: z.string().optional(),
      title: z.string(),
      meta_title: z.string().optional(),
      description: z.string().optional(),
      date: z.date(),  // TODO: Change blogposts
      image: image().optional(),  // TODO: Change blogposts
      heroImage: image().optional(),  // TODO: Change blogposts
      author: z.string().optional().default("Simon Podhajsky"),
      language: z.enum(["en", "cs"]).optional().default("en"),
      categories: z.array(z.string()).default(["others"]),
      draft: z.boolean().optional(),
    }),
});

// Author collection schema
const authorsCollection = defineCollection({
  schema: z.object({
    id: z.string().optional(),
    title: z.string(),
    meta_title: z.string().optional(),
    email: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    social: z
      .object({
        facebook: z.string().optional(),
        twitter: z.string().optional(),
        instagram: z.string().optional(),
      })
      .optional(),
    draft: z.boolean().optional(),
  }),
});

// Pages collection schema
const pagesCollection = defineCollection({
  schema: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    meta_title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    layout: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

const presentationCollection = defineCollection({
  type: "content",
  schema: ({ image }: { image: ImageFunction }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      place: z.string(),
      pubDate: z.coerce.date(),
      presentationUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      heroImage: image().optional(), // default is defined in the layout + index files
    }),
});

const podcastCollection = defineCollection({
  type: "content",
  schema: ({ image }: { image: ImageFunction }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      podcastUrl: z.string(),
      language: z.enum(["en", "cs"]).optional().default("cs"),
      role: z.enum(["host", "guest"]).default("guest"),
      heroImage: image().optional(), // default is defined in the layout + index files
    }),
});

const sideProjectCollection = defineCollection({
  type: "content",
  schema: ({ image }: { image: ImageFunction }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      githubUrl: z.string().optional(),
      projectUrl: z.string().optional(),
      blogRef: z.array(reference("blog")).optional(),
      technologies: z.array(z.string()).optional(),
      screenshots: z.array(image()).optional(),
      heroImage: image().optional(), // default is defined in the layout + index files
    }),
});

const nowCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    persistent: z.boolean().optional().default(false),
    relatedBlogs: z.array(z.string()).optional(),
    relatedSideProject: z.string().optional(),
  }),
});


// Export collections
export const collections = {
  contact: contactCollection,
  homepage: homepageCollection,
  blog: blogsCollection,
  authors: authorsCollection,
  pages: pagesCollection,
  now: nowCollection,
  presentations: presentationCollection,
  side_projects: sideProjectCollection,
  podcasts: podcastCollection,
  llms_txt: llmsMetaCollection,
};
