"use client";

import { UploadButton, UploadDropzone } from "@/components/uploadthing";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <UploadDropzone
        appearance={{
          button:
            "opacity-50 ut-ready:opacity-100 ut-readying:bg-primary ut-readying:text-primary-foreground ut-ready:bg-primary ut-ready:text-primary-foreground bg-primary text-primary-foreground ut-uploading:cursor-not-allowed",
          container:
            "w-full flex-col rounded-md dark:border-border border-border border-2 bg-card",
          label: "text-foreground dark:text-foreground",
          allowedContent:
            "flex h-8 flex-col items-center justify-center px-2 text-foreground dark:text-foreground",
        }}
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          // Do something with the response
          // TODO: Call backend trpc method to upload images to the database
          res.forEach((file) => {
            console.log("File: ", file.ufsUrl);
          });
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
      />
    </main>
  );
}
