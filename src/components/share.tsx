"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const expiresInOptions = [
  { label: "1 minute", value: "1m" },
  { label: "5 minutes", value: "5m" },
  { label: "10 minutes", value: "10m" },
  { label: "15 minutes", value: "15m" },
  { label: "30 minutes", value: "30m" },
  { label: "45 minutes", value: "45m", requiresPro: true },
  { label: "1 hour", value: "1h", requiresPro: true },
  { label: "4 hours", value: "4h", requiresPro: true },
  { label: "8 hours", value: "8h", requiresPro: true },
  { label: "12 hours", value: "12h", requiresPro: true },
  { label: "1 day", value: "1d", requiresPro: true },
  { label: "1 week", value: "1w", requiresPro: true },
  { label: "1 month", value: "1mo", requiresPro: true },
  { label: "Never", value: "never", requiresPro: true },
] as const;

const shareCreateTormSchema = z.object({
  content: z
    .string()
    .min(1, {
      message: "Content must be at least 1 character.",
    })
    .max(1024, {
      message: "Content must be less than 1024 characters.",
    }),
  expiresIn: z.enum(expiresInOptions.map((option) => option.value)),
  isOneTimeUse: z.boolean(),
  password: z.string(),
});

export function ShareCreateForm() {
  const form = useForm<z.infer<typeof shareCreateTormSchema>>({
    resolver: zodResolver(shareCreateTormSchema),
    defaultValues: {
      content: "",
      expiresIn: "1m",
      isOneTimeUse: false,
      password: "",
    },
  });
  const onSubmit = (data: z.infer<typeof shareCreateTormSchema>) => {
    console.log(data);
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full h-fit flex flex-col bg-card rounded-md border-border border-2 p-2 md:p-4 gap-2 md:gap-4"
      >
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
          <span className="text-muted-foreground">Have something to</span>
          <br />
          share?
        </h2>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <Textarea
                {...field}
                className="w-full h-24 resize-none"
                placeholder="Enter link / text / data"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiresIn"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <div className="w-full flex flex-row justify-between items-center gap-2">
                <FormLabel>Expires In</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value?.toString()}
                  name={field.name}
                >
                  <FormControl>
                    <SelectTrigger className="w-1/2 h-10">
                      <SelectValue placeholder="Expires In" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    <SelectGroup>
                      <SelectLabel>Expires In</SelectLabel>
                      {expiresInOptions.map((expiresIn) => (
                        <SelectItem
                          key={expiresIn.value}
                          value={expiresIn.value}
                        >
                          {expiresIn.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isOneTimeUse"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <div className="w-full flex flex-row justify-between items-center gap-2">
                <Label>
                  <span>One Time Use</span>
                </Label>
                <Switch
                  {...field}
                  value={field.value.toString()}
                  onCheckedChange={field.onChange}
                  //   onVolumeChange={(event) => {
                  //     console.log(event);
                  //     field.onChange(event.target.checked);
                  //   }}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <div className="w-full flex flex-row justify-between items-center gap-2">
                <Label>
                  <span>Password</span>
                  <div className="text-xs bg-sky-500/25 text-sky-500 px-2 py-1 rounded-md border border-sky-500/25">
                    Pro
                  </div>
                </Label>
                <Input
                  {...field}
                  disabled
                  type="password"
                  className="w-1/2 h-10"
                  placeholder="Enter password (optional)"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <Collapsible>
          <CollapsibleTrigger className="w-fit flex flex-row items-center gap-2 font-medium">
            Advanced Options <ChevronsUpDown className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            Yes. Free to use for personal and commercial projects. No
            attribution required.
          </CollapsibleContent>
        </Collapsible> */}
        <Button type="submit" className="w-fit">
          Share
        </Button>
      </form>
    </Form>
  );
}

const shareSeeTormSchema = z.object({
  code: z.string().length(6, {
    message: "Code must be 6 characters.",
  }),
});

export function ShareSeeForm() {
  const form = useForm<z.infer<typeof shareSeeTormSchema>>({
    resolver: zodResolver(shareSeeTormSchema),
    defaultValues: {
      code: "",
    },
  });
  const onSubmit = (data: z.infer<typeof shareSeeTormSchema>) => {
    console.log(data);
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full h-fit flex flex-col bg-card rounded-md border-border border-2 p-2 md:p-4 gap-2 md:gap-4"
      >
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
          <span className="text-muted-foreground">Have something to</span>
          <br />
          see?
        </h2>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <Input
                {...field}
                className="w-full h-12"
                placeholder="Enter code (e.g. XYZ123)"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-fit">
          See
        </Button>
      </form>
    </Form>
  );
}

export function ShareSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ShareCreateForm />

      <ShareSeeForm />
    </div>
  );
}
