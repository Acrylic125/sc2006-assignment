import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import {
  reviewTable,
  reviewImagesTable,
  poiTable,
  itineraryTable,
  itineraryPOITable,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clerkClient, User } from "@clerk/nextjs/server";

export const reviewRouter = createTRPCRouter({
  getReviews: publicProcedure
    .input(
      z.object({
        poiId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const reviews = await db
        .select({
          id: reviewTable.id,
          poiId: reviewTable.poiId,
          userId: reviewTable.userId,
          liked: reviewTable.liked,
          comment: reviewTable.comment,
        })
        .from(reviewTable)
        .where(eq(reviewTable.poiId, input.poiId))
        .orderBy(desc(reviewTable.id));

      if (reviews.length === 0) {
        return [];
      }

      // Get review images for all reviews
      const reviewImages = await db
        .select({
          reviewId: reviewImagesTable.reviewId,
          id: reviewImagesTable.id,
          imageUrl: reviewImagesTable.imageUrl,
        })
        .from(reviewImagesTable)
        .where(
          inArray(
            reviewImagesTable.reviewId,
            reviews.map((r) => r.id)
          )
        );

      // Group images by review ID
      const imagesByReviewId = reviewImages.reduce(
        (acc, img) => {
          if (!acc[img.reviewId]) {
            acc[img.reviewId] = [];
          }
          acc[img.reviewId].push({
            id: img.id,
            url: img.imageUrl,
          });
          return acc;
        },
        {} as Record<number, { id: number; url: string }[]>
      );

      // Get unique user IDs
      const uniqueUserIds = [
        ...new Set(reviews.map((review) => review.userId)),
      ];

      // Fetch user information from Clerk
      let clerkUsers: User[] = [];
      try {
        if (uniqueUserIds.length > 0) {
          const clerk = await clerkClient();
          const userListResponse = await clerk.users.getUserList({
            userId: uniqueUserIds,
            limit: uniqueUserIds.length,
          });
          clerkUsers = userListResponse.data;
        }
      } catch (error) {
        console.error("Failed to fetch users from Clerk:", error);
        // Continue without user data if Clerk fails
      }

      // Create a map of userId to user info
      const userMap = clerkUsers.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, User>
      );

      // Combine reviews with their images and user info
      return reviews.map((review) => ({
        ...review,
        images: imagesByReviewId[review.id] ?? [],
        user: userMap[review.userId] ?? {
          id: review.userId,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
        },
      }));
    }),

  getUserReview: protectedProcedure
    .input(
      z.object({
        poiId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      const review = await db
        .select({
          id: reviewTable.id,
          poiId: reviewTable.poiId,
          userId: reviewTable.userId,
          liked: reviewTable.liked,
          comment: reviewTable.comment,
        })
        .from(reviewTable)
        .where(
          and(
            eq(reviewTable.poiId, input.poiId),
            eq(reviewTable.userId, userId)
          )
        )
        .limit(1);

      if (review.length === 0) {
        return null;
      }

      // Get review images
      const reviewImages = await db
        .select({
          id: reviewImagesTable.id,
          imageUrl: reviewImagesTable.imageUrl,
        })
        .from(reviewImagesTable)
        .where(eq(reviewImagesTable.reviewId, review[0].id));

      // Get user info from Clerk
      let userInfo = null;
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        userInfo = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
        };
      } catch (error) {
        console.error("Failed to fetch user from Clerk:", error);
      }

      return {
        ...review[0],
        images: reviewImages.map((img) => ({
          id: img.id,
          url: img.imageUrl,
        })),
        user: userInfo || {
          id: userId,
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
        },
      };
    }),

  createReview: protectedProcedure
    .input(
      z.object({
        poiId: z.number(),
        liked: z.boolean(),
        comment: z.string().max(255).optional(),
        images: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Check if POI exists
      const poi = await db
        .select({ id: poiTable.id })
        .from(poiTable)
        .where(eq(poiTable.id, input.poiId))
        .limit(1);

      if (poi.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "POI not found",
        });
      }

      // Check if user already has a review for this POI
      const existingReview = await db
        .select({ id: reviewTable.id })
        .from(reviewTable)
        .where(
          and(
            eq(reviewTable.poiId, input.poiId),
            eq(reviewTable.userId, userId)
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "You have already reviewed this POI. You can only submit one review per POI.",
        });
      }

      // Create the review
      const newReview = await db
        .insert(reviewTable)
        .values({
          poiId: input.poiId,
          userId: userId,
          liked: input.liked,
          comment: input.comment || null,
        })
        .returning({
          id: reviewTable.id,
          poiId: reviewTable.poiId,
          userId: reviewTable.userId,
          liked: reviewTable.liked,
          comment: reviewTable.comment,
        });

      // Add review images if provided
      if (input.images && input.images.length > 0) {
        await db.insert(reviewImagesTable).values(
          input.images.map((imageUrl) => ({
            reviewId: newReview[0].id,
            imageUrl: imageUrl,
          }))
        );
      }

      return {
        ...newReview[0],
        images: input.images || [],
      };
    }),

  updateReview: protectedProcedure
    .input(
      z.object({
        poiId: z.number(),
        liked: z.boolean(),
        comment: z.string().max(255).optional(),
        // images: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Find the user's existing review
      const existingReview = await db
        .select({ id: reviewTable.id })
        .from(reviewTable)
        .where(
          and(
            eq(reviewTable.poiId, input.poiId),
            eq(reviewTable.userId, userId)
          )
        )
        .limit(1);

      if (existingReview.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found. Create a new review instead.",
        });
      }

      // Update the review
      const updatedReview = await db
        .update(reviewTable)
        .set({
          liked: input.liked,
          comment: input.comment || null,
        })
        .where(eq(reviewTable.id, existingReview[0].id))
        .returning({
          id: reviewTable.id,
          poiId: reviewTable.poiId,
          userId: reviewTable.userId,
          liked: reviewTable.liked,
          comment: reviewTable.comment,
        });

      // Remove existing images
      await db
        .delete(reviewImagesTable)
        .where(eq(reviewImagesTable.reviewId, existingReview[0].id));

      // Add new images if provided
      // if (input.images && input.images.length > 0) {
      //   await db.insert(reviewImagesTable).values(
      //     input.images.map((imageUrl) => ({
      //       reviewId: existingReview[0].id,
      //       imageUrl: imageUrl,
      //     }))
      //   );
      // }

      return {
        ...updatedReview[0],
        // images: input.images || [],
      };
    }),
  updateReviewImages: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        images: z.array(z.string()),
        toDeleteImages: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Check if the user owns this review
      const existingReview = await db
        .select({ userId: reviewTable.userId })
        .from(reviewTable)
        .where(eq(reviewTable.id, input.reviewId))
        .limit(1);

      if (existingReview.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      if (existingReview[0].userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own reviews",
        });
      }

      // Get review images
      const reviewImages = await db
        .select({ id: reviewImagesTable.id })
        .from(reviewImagesTable)
        .where(and(eq(reviewImagesTable.reviewId, input.reviewId)));

      const validRemovalIds = reviewImages
        .filter((image) => input.toDeleteImages.includes(image.id))
        .map((image) => image.id);

      const newNumberOfImages =
        reviewImages.length - validRemovalIds.length + input.images.length;

      if (newNumberOfImages > 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only have a maximum of 3 images per review",
        });
      }

      await db.transaction(async (tx) => {
        // Delete existing images
        if (validRemovalIds.length > 0) {
          await tx
            .delete(reviewImagesTable)
            .where(
              and(
                eq(reviewImagesTable.reviewId, input.reviewId),
                inArray(reviewImagesTable.id, validRemovalIds)
              )
            );
        }

        if (input.images.length > 0) {
          await tx.insert(reviewImagesTable).values(
            input.images.map((imageUrl) => ({
              reviewId: input.reviewId,
              imageUrl: imageUrl,
            }))
          );
        }
      });

      return { success: true };
    }),
  deleteReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Find the review and verify ownership
      const existingReview = await db
        .select({
          id: reviewTable.id,
          userId: reviewTable.userId,
        })
        .from(reviewTable)
        .where(eq(reviewTable.id, input.reviewId))
        .limit(1);

      if (existingReview.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      // Check if the user owns this review
      if (existingReview[0].userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own reviews",
        });
      }

      // Delete review images first (foreign key constraint)
      await db
        .delete(reviewImagesTable)
        .where(eq(reviewImagesTable.reviewId, input.reviewId));

      // Delete the review
      await db.delete(reviewTable).where(eq(reviewTable.id, input.reviewId));

      return { success: true };
    }),
});
