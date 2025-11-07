import { genUploader } from "uploadthing/client";

//based on https://medium.com/@chiomsyndev/implementing-controlled-file-uploads-in-react-with-uploadthing-67ddc5850905

export const useUploadImage = () => {
  const uploadImage = async (file: File) => {
    const uploadFiles = genUploader({
      url: "/api/uploadthing",
      package: "@uploadthing/react",
    });

    console.log("TEST");
    console.log(file);
    const uploadSession = await uploadFiles.createUpload("imageUploader", {
      files: [file],
    });

    const uploadedFiles = await uploadSession.done();

    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error("Image upload failed. Please try again.");
    }

    return uploadedFiles[0];
  };

  return { uploadImage };
};
