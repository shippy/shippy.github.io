import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional().default("/blog-placeholder-2.jpg"),
		categories: z.array(z.string()).optional(),
		language: z.enum(['en', 'cs']).optional().default('en')
	}),
});

const presentations = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		place: z.string(),
		pubDate: z.coerce.date(),
		presentationUrl: z.string(),
		videoUrl: z.string().optional(),
		heroImage: z.string().optional().default("/blog-placeholder-3.jpg"),
	}),
});

const side_projects = defineCollection({
	type: 'content',
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		githubUrl: z.string(),
		projectUrl: z.string().optional(),
		blogUrl: z.string().optional(),
		technologies: z.array(z.string()).optional(),
		screenshots: z.array(z.string()).optional(),
		heroImage: image(),
	}),
});

const now = defineCollection({
	type: 'content',
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
