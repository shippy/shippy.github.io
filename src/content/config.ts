import { defineCollection, reference, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(), // default is defined in the layout + index files
      categories: z.array(z.string()).optional(),
      language: z.enum(["en", "cs"]).optional().default("en"),
    }),
});

const presentations = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      place: z.string(),
      pubDate: z.coerce.date(),
      presentationUrl: z.string(),
      videoUrl: z.string().optional(),
      heroImage: image().optional(), // default is defined in the layout + index files
    }),
});

const side_projects = defineCollection({
  type: "content",
  schema: ({ image }) =>
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

const now = defineCollection({
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

export const collections = { blog, presentations, side_projects, now };
