import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  DislikeButton,
  LikeButton,
} from "@/components/icons/like-dislike-icons";

const POIReviewFormSchema = z.object({
  liked: z.boolean(),
  comment: z.string().optional(),
});

export function POIReviewDialog({
  options,
  close,
}: {
  options: ExtractOptions<"itinerary-poi-review">;
  close: () => void;
}) {
  const createReviewMutation = trpc.review.createReview.useMutation();
  const form = useForm<z.infer<typeof POIReviewFormSchema>>({
    resolver: zodResolver(POIReviewFormSchema),
    defaultValues: {
      liked: false,
      comment: "",
    },
  });

  const onSubmit = (data: z.infer<typeof POIReviewFormSchema>) => {
    console.log(data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Review this Place!</DialogTitle>
        <DialogDescription>
          Let us know how you felt about it.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="liked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Did you like this place?</FormLabel>
                <FormControl>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => field.onChange(true)}
                    >
                      <LikeButton active={field.value} /> Like
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => field.onChange(false)}
                    >
                      <DislikeButton active={!field.value} /> Dislike
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* <FormField
            control={form.control}
            name="liked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Liked</FormLabel>
                <FormControl>
                  <Input placeholder="Enter timetable name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment</FormLabel>
                <FormControl>
                  <Input placeholder="Comments (Optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {createReviewMutation.isError && (
            <Alert variant="error">
              <AlertTitle>Unable to create review.</AlertTitle>
              <AlertDescription>
                <p>{createReviewMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={close}
              disabled={createReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending ? "Creating..." : "Review"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
