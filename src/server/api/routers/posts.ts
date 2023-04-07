/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
// import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

type Post = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  content: string | null;
  published: boolean;
  authorId: string;
};

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const posts: Post[] = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    const users = (
      await clerkClient.users.getUserList({
        userId: posts.map((post) => post.authorId),
        limit: 100,
      })
    ).map(filterUserForClient);

    return posts.map((post: Post) => {
      const user = users.find((user) => user.id === post.authorId);
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author not found",
        });
      }
      return {
        ...post,
        author: user,
      };
    });
  }),
});
