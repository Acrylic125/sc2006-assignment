import { useUploadImage } from "@/app/api/uploadthing/client";

const { uploadImage } = useUploadImage();

const handleUpload = async (file: File) => {
  try {
    const result = await uploadImage(file);
    console.log("Uploaded:", result.url);
  } catch (err) {
    console.error("Upload failed", err);
  }
};
